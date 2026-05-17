import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, RouteShiftStatus, ServiceOrderStatus, ServiceOrderStopStatus } from '@prisma/client';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { calculateRouteDistanceKm } from '../routes/route-distance';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { OdometerPhotoDto, UploadOdometerPhotoDto } from './dto/odometer-photo.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { OrdersStorageService } from './orders-storage.service';

type OrderWithRelations = Prisma.ServiceOrderGetPayload<{
  include: ReturnType<OrdersService['orderInclude']>;
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly storage: OrdersStorageService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateServiceOrderDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    await this.ensureAssignment(companyId, dto.employeeId, dto.vehicleId);

    const order = await this.prisma.serviceOrder.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        employeeId: dto.employeeId,
        vehicleId: dto.vehicleId,
        scheduledDate: dto.scheduledDate,
        stops: {
          create: dto.stops
            .sort((a, b) => a.visitOrder - b.visitOrder)
            .map((stop) => ({
              companyId,
              customerName: stop.customerName,
              address: stop.address,
              latitude: stop.latitude,
              longitude: stop.longitude,
              visitOrder: stop.visitOrder,
            })),
        },
      },
      include: this.orderInclude(),
    });

    await this.writeAuditLog({
      userId: user.sub,
      companyId,
      action: 'SERVICE_ORDER_CREATED',
      entity: 'ServiceOrder',
      entityId: order.id,
      metadata: {
        employeeId: dto.employeeId ?? null,
        vehicleId: dto.vehicleId ?? null,
        stops: order.stops.length,
      },
    });

    return this.serializeOrder(order);
  }

  async findMany(user: AuthenticatedUser, query: OrdersQueryDto) {
    const companyId = user.role === Role.MASTER_ADMIN ? undefined : this.tenantScope.requireCompanyId(user);
    const where: Prisma.ServiceOrderWhereInput = {
      companyId,
      employeeId: user.role === Role.EMPLOYEE ? user.sub : query.employeeId,
      vehicleId: query.vehicleId,
      status: query.status,
      scheduledDate:
        query.startDate || query.endDate
          ? {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            }
          : undefined,
    };

    const orders = await this.prisma.serviceOrder.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
      take: 300,
      include: this.orderInclude(),
    });

    return Promise.all(orders.map((order) => this.serializeOrder(order)));
  }

  async myToday(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.findMany(user, { startDate: start, endDate: end });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const order = await this.ensureOrderAccess(user, id);
    return this.serializeOrder(order);
  }

  async route(user: AuthenticatedUser, id: string) {
    const order = await this.ensureOrderAccess(user, id);
    return {
      id: order.id,
      title: order.title,
      status: order.status,
      stops: order.stops.map((stop) => ({
        id: stop.id,
        customerName: stop.customerName,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        visitOrder: stop.visitOrder,
        status: stop.status,
        completedAt: stop.completedAt,
      })),
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateServiceOrderDto) {
    const existing = await this.ensureOrderAccess(user, id);

    if (user.role !== Role.COMPANY_ADMIN) {
      throw new ForbiddenException('Apenas o admin da empresa pode atualizar atribuicoes de OS.');
    }

    await this.ensureAssignment(existing.companyId, dto.employeeId ?? undefined, dto.vehicleId ?? undefined);

    const order = await this.prisma.serviceOrder.update({
      where: { id: existing.id },
      data: {
        title: dto.title,
        description: dto.description,
        employeeId: dto.employeeId,
        vehicleId: dto.vehicleId,
        status: dto.status,
        scheduledDate: dto.scheduledDate,
        notes: dto.notes,
      },
      include: this.orderInclude(),
    });

    return this.serializeOrder(order);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const order = await this.ensureOrderAccess(user, id);

    if (user.role !== Role.COMPANY_ADMIN) {
      throw new ForbiddenException('Apenas o admin da empresa pode excluir OS.');
    }

    await this.prisma.serviceOrder.delete({ where: { id: order.id } });
    return { deleted: true };
  }

  async start(user: AuthenticatedUser, id: string, dto: OdometerPhotoDto) {
    const order = await this.ensureOrderAccess(user, id);

    this.ensureEmployeeCanOperate(user, order, 'iniciar');

    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Somente OS pendente pode ser iniciada.');
    }

    const photoPath = await this.resolveOdometerPhotoPath(order, dto, 'start', user.sub);
    const activeRoute = await this.prisma.routeShift.findFirst({
      where: { companyId: order.companyId, employeeId: user.sub, status: RouteShiftStatus.IN_PROGRESS },
      select: { id: true },
    });

    if (activeRoute) {
      throw new ConflictException('Funcionario ja possui uma rota em andamento.');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const routeShift = await tx.routeShift.create({
        data: {
          companyId: order.companyId,
          employeeId: user.sub,
          vehicleId: order.vehicleId,
          startedAt: now,
          startLatitude: dto.latitude,
          startLongitude: dto.longitude,
          status: RouteShiftStatus.IN_PROGRESS,
        },
        select: { id: true },
      });

      return tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          routeShiftId: routeShift.id,
          status: ServiceOrderStatus.IN_PROGRESS,
          startedAt: now,
          initialOdometerKm: dto.odometerKm,
          initialOdometerPhotoPath: photoPath,
          notes: dto.notes ?? order.notes,
        },
        include: this.orderInclude(),
      });
    });

    await this.writeAuditLog({
      userId: user.sub,
      companyId: order.companyId,
      action: 'SERVICE_ORDER_STARTED',
      entity: 'ServiceOrder',
      entityId: order.id,
      metadata: { routeShiftId: updated.routeShiftId ?? null },
    });

    return this.serializeOrder(updated);
  }

  async uploadOdometerPhoto(user: AuthenticatedUser, id: string, dto: UploadOdometerPhotoDto) {
    const order = await this.ensureOrderAccess(user, id);
    this.ensureEmployeeCanOperate(user, order, 'enviar foto desta');

    if (dto.stage === 'START' && order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Foto inicial so pode ser enviada antes de iniciar a OS.');
    }

    if (dto.stage === 'FINISH' && order.status !== ServiceOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Foto final so pode ser enviada com OS em andamento.');
    }

    if (dto.stage === 'FINISH') {
      const initialKm = Number(order.initialOdometerKm ?? 0);
      if (dto.odometerKm < initialKm) {
        throw new BadRequestException('KM final nao pode ser menor que o KM inicial.');
      }
    }

    const photo = await this.storage.uploadOdometerPhoto({
      companyId: order.companyId,
      orderId: order.id,
      userId: user.sub,
      stage: dto.stage === 'START' ? 'start' : 'finish',
      base64: dto.photoBase64,
      contentType: dto.photoContentType,
    });

    const updated = await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data:
        dto.stage === 'START'
          ? {
              initialOdometerKm: dto.odometerKm,
              initialOdometerPhotoPath: photo.path,
              notes: dto.notes ?? order.notes,
            }
          : {
              finalOdometerKm: dto.odometerKm,
              finalOdometerPhotoPath: photo.path,
              notes: dto.notes ?? order.notes,
            },
      include: this.orderInclude(),
    });

    await this.writeAuditLog({
      userId: user.sub,
      companyId: order.companyId,
      action: 'ODOMETER_PHOTO_UPLOADED',
      entity: 'ServiceOrder',
      entityId: order.id,
      metadata: { stage: dto.stage },
    });

    return this.serializeOrder(updated);
  }

  async finish(user: AuthenticatedUser, id: string, dto: OdometerPhotoDto) {
    const order = await this.ensureOrderAccess(user, id);

    this.ensureEmployeeCanOperate(user, order, 'finalizar');

    if (order.status !== ServiceOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Somente OS em andamento pode ser finalizada.');
    }

    const initialKm = Number(order.initialOdometerKm ?? 0);
    if (dto.odometerKm < initialKm) {
      throw new BadRequestException('KM final nao pode ser menor que o KM inicial.');
    }

    const photoPath = await this.resolveOdometerPhotoPath(order, dto, 'finish', user.sub);
    if (order.routeShiftId) {
      await this.finishLinkedRouteShift(order.routeShiftId, dto.latitude, dto.longitude);
    }

    const updated = await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        status: ServiceOrderStatus.FINISHED,
        finishedAt: new Date(),
        finalOdometerKm: dto.odometerKm,
        finalOdometerPhotoPath: photoPath,
        notes: dto.notes ?? order.notes,
        stops: {
          updateMany: {
            where: { status: ServiceOrderStopStatus.PENDING },
            data: { status: ServiceOrderStopStatus.COMPLETED, completedAt: new Date() },
          },
        },
      },
      include: this.orderInclude(),
    });

    if (order.vehicleId) {
      await this.prisma.vehicle.updateMany({
        where: { id: order.vehicleId, companyId: order.companyId },
        data: { currentKm: { increment: new Prisma.Decimal(dto.odometerKm - initialKm) } },
      });
    }

    await this.writeAuditLog({
      userId: user.sub,
      companyId: order.companyId,
      action: 'SERVICE_ORDER_FINISHED',
      entity: 'ServiceOrder',
      entityId: order.id,
      metadata: {
        routeShiftId: order.routeShiftId ?? null,
        odometerDistanceKm: Number((dto.odometerKm - initialKm).toFixed(2)),
      },
    });

    return this.serializeOrder(updated);
  }

  async odometerPhotos(user: AuthenticatedUser, id: string) {
    const order = await this.ensureOrderAccess(user, id);
    const serialized = await this.serializeOrder(order);

    return {
      orderId: serialized.id,
      status: serialized.status,
      initial: {
        odometerKm: serialized.initialOdometerKm,
        photoPath: serialized.initialOdometerPhotoPath,
        photoUrl: serialized.initialOdometerPhotoUrl,
        recordedAt: serialized.startedAt,
        uploaded: Boolean(serialized.initialOdometerPhotoPath),
      },
      final: {
        odometerKm: serialized.finalOdometerKm,
        photoPath: serialized.finalOdometerPhotoPath,
        photoUrl: serialized.finalOdometerPhotoUrl,
        recordedAt: serialized.finishedAt,
        uploaded: Boolean(serialized.finalOdometerPhotoPath),
      },
      odometerDistanceKm: serialized.odometerDistanceKm,
    };
  }

  async tracking(user: AuthenticatedUser, id: string) {
    const order = await this.ensureOrderAccess(user, id);

    if (!order.routeShiftId) {
      return {
        orderId: order.id,
        routeShift: null,
        points: [],
        pointsCount: 0,
        latestPoint: null,
        startPoint: null,
        currentPoint: null,
        liveDistanceKm: 0,
        liveDurationMinutes: 0,
        trackingStatus: order.status,
        lastPointAt: null,
      };
    }

    const routeShift = await this.prisma.routeShift.findUnique({
      where: { id: order.routeShiftId },
      include: {
        points: { orderBy: { recordedAt: 'asc' } },
        employee: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true, currentKm: true } },
      },
    });

    if (!routeShift) {
      throw new NotFoundException('Rota vinculada a OS nao encontrada.');
    }

    const points = routeShift.points ?? [];
    const latestPoint = points.at(-1) ?? null;
    const startPoint =
      routeShift.startLatitude && routeShift.startLongitude
        ? {
            latitude: routeShift.startLatitude,
            longitude: routeShift.startLongitude,
            recordedAt: routeShift.startedAt,
          }
        : null;
    const liveDistanceKm = calculateRouteDistanceKm(
      points.map((point) => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        accuracy: point.accuracy == null ? null : Number(point.accuracy),
        recordedAt: point.recordedAt,
      })),
    );
    const endedAt = routeShift.endedAt ?? new Date();
    const liveDurationMinutes =
      routeShift.status === RouteShiftStatus.FINISHED
        ? routeShift.totalDurationMinutes
        : Math.max(0, Math.round((endedAt.getTime() - routeShift.startedAt.getTime()) / 60000));

    return {
      orderId: order.id,
      routeShift,
      points,
      pointsCount: points.length,
      latestPoint,
      startPoint,
      currentPoint: latestPoint ?? startPoint,
      liveDistanceKm,
      liveDurationMinutes,
      trackingStatus: routeShift.status,
      lastPointAt: latestPoint?.recordedAt ?? null,
    };
  }

  async completeStop(user: AuthenticatedUser, orderId: string, stopId: string) {
    const order = await this.ensureOrderAccess(user, orderId);

    if (user.role !== Role.EMPLOYEE || order.employeeId !== user.sub) {
      throw new ForbiddenException('Apenas o funcionario atribuido pode concluir pontos da OS.');
    }

    const stop = await this.prisma.serviceOrderStop.findFirst({
      where: { id: stopId, orderId: order.id, companyId: order.companyId },
    });

    if (!stop) {
      throw new NotFoundException('Ponto da OS nao encontrado.');
    }

    return this.prisma.serviceOrderStop.update({
      where: { id: stop.id },
      data: { status: ServiceOrderStopStatus.COMPLETED, completedAt: new Date() },
    });
  }

  private async ensureAssignment(companyId: string, employeeId?: string | null, vehicleId?: string | null) {
    if (employeeId) {
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId, role: Role.EMPLOYEE },
        select: { id: true },
      });

      if (!employee) {
        throw new NotFoundException('Funcionario nao encontrado.');
      }
    }

    if (vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { id: true, employeeId: true },
      });

      if (!vehicle) {
        throw new NotFoundException('Veiculo nao encontrado.');
      }

      if (employeeId && vehicle.employeeId && vehicle.employeeId !== employeeId) {
        throw new BadRequestException('O veiculo informado esta vinculado a outro funcionario.');
      }
    }
  }

  private ensureEmployeeCanOperate(user: AuthenticatedUser, order: { employeeId: string | null }, action: string) {
    if (user.role !== Role.EMPLOYEE || order.employeeId !== user.sub) {
      throw new ForbiddenException(`Apenas o funcionario atribuido pode ${action} esta OS.`);
    }
  }

  private async resolveOdometerPhotoPath(
    order: OrderWithRelations,
    dto: OdometerPhotoDto,
    stage: 'start' | 'finish',
    userId: string,
  ) {
    if (dto.photoBase64) {
      const photo = await this.storage.uploadOdometerPhoto({
        companyId: order.companyId,
        orderId: order.id,
        userId,
        stage,
        base64: dto.photoBase64,
        contentType: dto.photoContentType,
      });

      return photo.path;
    }

    const existingPath = stage === 'start' ? order.initialOdometerPhotoPath : order.finalOdometerPhotoPath;
    if (!existingPath) {
      throw new BadRequestException(
        stage === 'start'
          ? 'Foto do odometro inicial e obrigatoria antes de iniciar a OS.'
          : 'Foto do odometro final e obrigatoria antes de finalizar a OS.',
      );
    }

    return existingPath;
  }

  private async finishLinkedRouteShift(routeShiftId: string, latitude?: number, longitude?: number) {
    const route = await this.prisma.routeShift.findUnique({
      where: { id: routeShiftId },
      include: { points: { orderBy: { recordedAt: 'asc' } } },
    });

    if (!route || route.status === RouteShiftStatus.FINISHED) {
      return route;
    }

    const totalDistanceKm = calculateRouteDistanceKm(
      route.points.map((point) => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        accuracy: point.accuracy == null ? null : Number(point.accuracy),
        recordedAt: point.recordedAt,
      })),
    );
    const endedAt = new Date();
    const totalDurationMinutes = Math.max(0, Math.round((endedAt.getTime() - route.startedAt.getTime()) / 60000));

    return this.prisma.routeShift.update({
      where: { id: route.id },
      data: {
        endedAt,
        endLatitude: latitude,
        endLongitude: longitude,
        totalDistanceKm,
        totalDurationMinutes,
        status: RouteShiftStatus.FINISHED,
      },
    });
  }

  private async ensureOrderAccess(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Ordem de servico nao encontrada.');
    }

    if (user.role === Role.COMPANY_ADMIN) {
      this.tenantScope.assertCompanyAccess(user, order.companyId);
      return order;
    }

    if (user.role === Role.EMPLOYEE && order.employeeId === user.sub) {
      this.tenantScope.assertCompanyAccess(user, order.companyId);
      return order;
    }

    if (user.role === Role.MASTER_ADMIN) {
      return order;
    }

    throw new ForbiddenException('Acesso negado a esta OS.');
  }

  private async serializeOrder(order: OrderWithRelations) {
    const [initialOdometerPhotoUrl, finalOdometerPhotoUrl] = await Promise.all([
      this.storage.createSignedUrl(order.initialOdometerPhotoPath),
      this.storage.createSignedUrl(order.finalOdometerPhotoPath),
    ]);

    const initialKm = Number(order.initialOdometerKm ?? 0);
    const finalKm = Number(order.finalOdometerKm ?? 0);

    return {
      ...order,
      initialOdometerPhotoUrl,
      finalOdometerPhotoUrl,
      odometerDistanceKm: finalKm > 0 && initialKm > 0 ? Number((finalKm - initialKm).toFixed(2)) : 0,
    };
  }

  private orderInclude() {
    return {
      employee: { select: { id: true, name: true, email: true, phone: true } },
      vehicle: {
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          currentKm: true,
          employeeId: true,
        },
      },
      routeShift: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          totalDistanceKm: true,
          totalDurationMinutes: true,
          _count: { select: { points: true } },
        },
      },
      stops: { orderBy: { visitOrder: 'asc' as const } },
    };
  }

  private async writeAuditLog(params: {
    userId?: string | null;
    companyId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          companyId: params.companyId ?? null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId ?? null,
          metadata: params.metadata ?? {},
        },
      });
    } catch {
      // Auditoria nao deve bloquear a operacao principal do prototipo.
    }
  }
}
