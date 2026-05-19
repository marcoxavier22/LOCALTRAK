import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GeocodingStatus,
  OdometerPhotoType,
  Prisma,
  Role,
  RouteShiftStatus,
  ServiceOrderStatus,
  ServiceOrderStopStatus,
} from '@prisma/client';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { calculateRouteDistanceKm } from '../routes/route-distance';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { OdometerPhotoDto, UploadOdometerPhotoDto } from './dto/odometer-photo.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { ServiceOrderStopDto } from './dto/service-order-stop.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { OrdersStorageService } from './orders-storage.service';
import { GeocodingService } from '../common/geocoding/geocoding.service';

type OrderWithRelations = Prisma.ServiceOrderGetPayload<{
  include: ReturnType<OrdersService['orderInclude']>;
}>;

type CompanyOperationSettings = {
  requireOdometerStartPhoto: boolean;
  requireOdometerFinishPhoto: boolean;
  requireOdometerStartKm: boolean;
  requireOdometerFinishKm: boolean;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly storage: OrdersStorageService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateServiceOrderDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    await this.ensureAssignment(companyId, dto.employeeId, dto.vehicleId);

    // Resolve as coordenadas de cada parada de forma síncrona/segura antes de criar a OS
    const processedStops = [];
    for (const stop of dto.stops) {
      processedStops.push(await this.prepareStopForCreate(companyId, stop));
    }

    const order = await this.prisma.serviceOrder.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        employeeId: dto.employeeId,
        vehicleId: dto.vehicleId,
        scheduledDate: dto.scheduledDate,
        stops: {
          create: processedStops.sort((a, b) => a.visitOrder - b.visitOrder),
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
        customerId: stop.customerId,
        customerName: stop.customerName,
        customerEmail: stop.customerEmail,
        customerPhone: stop.customerPhone,
        address: stop.address,
        cep: stop.cep,
        street: stop.street,
        number: stop.number,
        complement: stop.complement,
        neighborhood: stop.neighborhood,
        city: stop.city,
        state: stop.state,
        country: stop.country,
        addressReference: stop.addressReference,
        latitude: stop.latitude,
        longitude: stop.longitude,
        geocodingStatus: stop.geocodingStatus,
        geocodingUpdatedAt: stop.geocodingUpdatedAt,
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

    const settings = await this.getCompanyOperationSettings(order.companyId);
    const initialOdometerKm = this.resolveRequiredOdometerKm(order, dto, 'start', settings);
    const photoPath = await this.resolveOdometerPhotoPath(order, dto, 'start', user.sub, settings);
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
          initialOdometerKm,
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
      if (dto.odometerKm !== undefined && dto.odometerKm < initialKm) {
        throw new BadRequestException('KM final nao pode ser menor que o KM inicial.');
      }
    }

    const photoPath = await this.uploadAndRecordOdometerPhoto(order, dto, dto.stage === 'START' ? 'start' : 'finish', user.sub);

    const updated = await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data:
        dto.stage === 'START'
          ? {
              initialOdometerKm: dto.odometerKm,
              initialOdometerPhotoPath: photoPath,
              notes: dto.notes ?? order.notes,
            }
          : {
              finalOdometerKm: dto.odometerKm,
              finalOdometerPhotoPath: photoPath,
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

    const settings = await this.getCompanyOperationSettings(order.companyId);
    const finalOdometerKm = this.resolveRequiredOdometerKm(order, dto, 'finish', settings);
    const initialKm = order.initialOdometerKm == null ? null : Number(order.initialOdometerKm);
    if (finalOdometerKm !== undefined && initialKm !== null && finalOdometerKm < initialKm) {
      throw new BadRequestException('KM final nao pode ser menor que o KM inicial.');
    }

    const photoPath = await this.resolveOdometerPhotoPath(order, dto, 'finish', user.sub, settings);
    const linkedRoute = order.routeShiftId
      ? await this.finishLinkedRouteShift(order.routeShiftId, dto.latitude, dto.longitude)
      : null;

    const updated = await this.prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        status: ServiceOrderStatus.FINISHED,
        finishedAt: new Date(),
        finalOdometerKm,
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

    const odometerDelta =
      finalOdometerKm !== undefined && initialKm !== null ? Number((finalOdometerKm - initialKm).toFixed(2)) : null;
    const routeDistance = linkedRoute?.totalDistanceKm == null ? 0 : Number(linkedRoute.totalDistanceKm);
    const distanceToIncrement = odometerDelta !== null && odometerDelta >= 0 ? odometerDelta : routeDistance;

    if (order.vehicleId && distanceToIncrement > 0) {
      await this.prisma.vehicle.updateMany({
        where: { id: order.vehicleId, companyId: order.companyId },
        data: { currentKm: { increment: new Prisma.Decimal(distanceToIncrement) } },
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
        odometerDistanceKm: odometerDelta,
        routeDistanceKm: routeDistance,
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

  private async prepareStopForCreate(companyId: string, stop: ServiceOrderStopDto) {
    const customer = stop.customerId
      ? await this.prisma.customer.findFirst({
          where: { id: stop.customerId, companyId, deletedAt: null },
        })
      : null;

    if (stop.customerId && !customer) {
      throw new NotFoundException('Cliente informado na OS nao foi encontrado.');
    }

    const address = this.buildStopAddress({
      address: stop.address ?? customer?.address,
      street: stop.street ?? customer?.street ?? undefined,
      number: stop.number ?? customer?.number ?? undefined,
      complement: stop.complement ?? customer?.complement ?? undefined,
      neighborhood: stop.neighborhood ?? customer?.neighborhood ?? undefined,
      city: stop.city ?? customer?.city ?? undefined,
      state: stop.state ?? customer?.state ?? undefined,
      country: stop.country ?? customer?.country ?? undefined,
    });

    if (!address) {
      throw new BadRequestException('Informe o endereco da parada da OS.');
    }

    let latitude = customer?.latitude == null ? undefined : Number(customer.latitude);
    let longitude = customer?.longitude == null ? undefined : Number(customer.longitude);
    let geocodingStatus: GeocodingStatus =
      latitude !== undefined && longitude !== undefined
        ? customer?.geocodingStatus ?? GeocodingStatus.RESOLVED
        : GeocodingStatus.PENDING;
    let geocodingUpdatedAt = customer?.geocodingUpdatedAt ?? null;

    if (latitude === undefined || longitude === undefined) {
      const resolved = await this.geocodingService.geocode(address);
      if (resolved) {
        latitude = resolved.latitude;
        longitude = resolved.longitude;
        geocodingStatus = GeocodingStatus.RESOLVED;
      } else {
        geocodingStatus = GeocodingStatus.FAILED;
      }
      geocodingUpdatedAt = new Date();
    }

    return {
      companyId,
      customerId: customer?.id ?? null,
      customerName: stop.customerName || customer?.name || null,
      customerEmail: stop.customerEmail || customer?.email || null,
      customerPhone: stop.customerPhone || customer?.phone || null,
      address,
      cep: stop.cep || customer?.cep || null,
      street: stop.street || customer?.street || null,
      number: stop.number || customer?.number || null,
      complement: stop.complement || customer?.complement || null,
      neighborhood: stop.neighborhood || customer?.neighborhood || null,
      city: stop.city || customer?.city || null,
      state: stop.state || customer?.state || null,
      country: stop.country || customer?.country || 'Brasil',
      addressReference: stop.addressReference || null,
      latitude,
      longitude,
      geocodingStatus,
      geocodingUpdatedAt,
      visitOrder: stop.visitOrder,
    };
  }

  private buildStopAddress(input: {
    address?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }) {
    const explicit = this.optional(input.address);
    if (explicit) {
      return explicit;
    }

    const line = [input.street, input.number].map((part) => this.optional(part)).filter(Boolean).join(', ');
    const area = [input.neighborhood, input.city, input.state].map((part) => this.optional(part)).filter(Boolean).join(' - ');
    const country = this.optional(input.country) ?? 'Brasil';
    return [line, area, country].filter(Boolean).join(', ');
  }

  private optional(value?: string | null) {
    const normalized = typeof value === 'string' ? value.trim() : value;
    return normalized || null;
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
    settings: CompanyOperationSettings,
  ) {
    if (dto.photoBase64) {
      return this.uploadAndRecordOdometerPhoto(order, dto, stage, userId);
    }

    const existingPath = stage === 'start' ? order.initialOdometerPhotoPath : order.finalOdometerPhotoPath;
    const isRequired =
      stage === 'start' ? settings.requireOdometerStartPhoto : settings.requireOdometerFinishPhoto;
    if (!existingPath) {
      if (!isRequired) {
        return null;
      }

      throw new BadRequestException(
        stage === 'start'
          ? 'Foto do odometro inicial e obrigatoria antes de iniciar a OS.'
          : 'Foto do odometro final e obrigatoria antes de finalizar a OS.',
      );
    }

    return existingPath;
  }

  private async uploadAndRecordOdometerPhoto(
    order: OrderWithRelations,
    dto: OdometerPhotoDto,
    stage: 'start' | 'finish',
    userId: string,
  ) {
    if (!dto.photoBase64) {
      throw new BadRequestException('Foto do odometro nao enviada.');
    }

    const photo = await this.storage.uploadOdometerPhoto({
      companyId: order.companyId,
      orderId: order.id,
      userId,
      stage,
      base64: dto.photoBase64,
      contentType: dto.photoContentType,
    });

    await this.prisma.odometerPhoto.create({
      data: {
        companyId: order.companyId,
        orderId: order.id,
        routeShiftId: order.routeShiftId,
        employeeId: userId,
        vehicleId: order.vehicleId,
        type: stage === 'start' ? OdometerPhotoType.START : OdometerPhotoType.FINISH,
        filePath: photo.path,
        contentType: photo.contentType,
        sizeBytes: photo.sizeBytes,
        odometerKm: dto.odometerKm,
      },
    });

    return photo.path;
  }

  private resolveRequiredOdometerKm(
    order: OrderWithRelations,
    dto: OdometerPhotoDto,
    stage: 'start' | 'finish',
    settings: CompanyOperationSettings,
  ) {
    const existing = stage === 'start' ? order.initialOdometerKm : order.finalOdometerKm;
    const value = dto.odometerKm ?? (existing == null ? undefined : Number(existing));
    const isRequired = stage === 'start' ? settings.requireOdometerStartKm : settings.requireOdometerFinishKm;

    if (value === undefined && isRequired) {
      throw new BadRequestException(
        stage === 'start'
          ? 'KM inicial e obrigatorio antes de iniciar a OS.'
          : 'KM final e obrigatorio antes de finalizar a OS.',
      );
    }

    return value;
  }

  private async getCompanyOperationSettings(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        requireOdometerStartPhoto: true,
        requireOdometerFinishPhoto: true,
        requireOdometerStartKm: true,
        requireOdometerFinishKm: true,
      },
    });

    return {
      requireOdometerStartPhoto: company?.requireOdometerStartPhoto ?? true,
      requireOdometerFinishPhoto: company?.requireOdometerFinishPhoto ?? true,
      requireOdometerStartKm: company?.requireOdometerStartKm ?? true,
      requireOdometerFinishKm: company?.requireOdometerFinishKm ?? true,
    };
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
