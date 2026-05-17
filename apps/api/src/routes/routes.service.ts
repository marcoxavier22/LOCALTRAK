import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, RouteShiftStatus, VehicleOwnershipType } from '@prisma/client';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { AddRoutePointsDto } from './dto/add-route-points.dto';
import { CompanyRoutesQueryDto } from './dto/company-routes-query.dto';
import { FinishRouteDto } from './dto/finish-route.dto';
import { StartRouteDto } from './dto/start-route.dto';
import { calculateRouteDistanceKm } from './route-distance';

const PAUSED_AFTER_MINUTES_WITHOUT_POINT = 5;

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async start(user: AuthenticatedUser, dto: StartRouteDto) {
    const companyId = this.tenantScope.requireCompanyId(user);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const activeRoute = await tx.routeShift.findFirst({
            where: { companyId, employeeId: user.sub, status: RouteShiftStatus.IN_PROGRESS },
            select: { id: true },
          });

          if (activeRoute) {
            throw new ConflictException('Funcionario ja possui uma rota em andamento.');
          }

          const vehicleId = await this.resolveRouteVehicleId(tx, companyId, user.sub, dto.vehicleId);

          return tx.routeShift.create({
            data: {
              companyId,
              employeeId: user.sub,
              vehicleId,
              startedAt: new Date(),
              startLatitude: dto.latitude,
              startLongitude: dto.longitude,
              status: RouteShiftStatus.IN_PROGRESS,
            },
            select: this.routeSummarySelect(),
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Funcionario ja possui uma rota em andamento.');
      }

      throw error;
    }
  }

  async addPoints(user: AuthenticatedUser, routeShiftId: string, dto: AddRoutePointsDto) {
    const route = await this.ensureRouteAccess(user, routeShiftId);

    if (route.status !== RouteShiftStatus.IN_PROGRESS && route.status !== RouteShiftStatus.SYNC_PENDING) {
      throw new ForbiddenException('A rota nao esta em andamento.');
    }

    await this.prisma.routePoint.createMany({
      data: dto.points.map((point) => ({
        routeShiftId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        speed: point.speed,
        altitude: point.altitude,
        batteryLevel: point.batteryLevel,
        recordedAt: point.recordedAt,
      })),
      skipDuplicates: false,
    });

    return { received: dto.points.length };
  }

  async finish(user: AuthenticatedUser, routeShiftId: string, dto: FinishRouteDto) {
    const route = await this.ensureRouteAccess(user, routeShiftId);
    if (route.status === RouteShiftStatus.FINISHED) {
      return this.prisma.routeShift.findUnique({
        where: { id: route.id },
        select: this.routeSummarySelect(),
      });
    }

    const points = await this.prisma.routePoint.findMany({
      where: { routeShiftId },
      orderBy: { recordedAt: 'asc' },
    });

    const totalDistanceKm = calculateRouteDistanceKm(
      points.map((point) => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        accuracy: point.accuracy == null ? null : Number(point.accuracy),
        recordedAt: point.recordedAt,
      })),
    );

    const endedAt = new Date();
    const totalDurationMinutes = Math.max(
      0,
      Math.round((endedAt.getTime() - route.startedAt.getTime()) / 60000),
    );

    const routeCosts = await this.calculateRouteCosts(
      route.companyId,
      route.vehicleId,
      totalDistanceKm,
    );

    const updatedRoute = await this.prisma.routeShift.update({
      where: { id: routeShiftId },
      data: {
        endedAt,
        endLatitude: dto.latitude,
        endLongitude: dto.longitude,
        totalDistanceKm,
        totalDurationMinutes,
        estimatedFuelCost: routeCosts.estimatedFuelCost,
        reimbursementValue: routeCosts.reimbursementValue,
        status: RouteShiftStatus.FINISHED,
      },
    });

    if (route.vehicleId && totalDistanceKm > 0) {
      await this.prisma.vehicle.updateMany({
        where: { id: route.vehicleId, companyId: route.companyId },
        data: { currentKm: { increment: new Prisma.Decimal(totalDistanceKm) } },
      });
    }

    await this.writeAuditLog({
      userId: user.sub,
      companyId: route.companyId,
      action: 'ROUTE_FINISHED',
      entity: 'RouteShift',
      entityId: route.id,
      metadata: {
        vehicleId: route.vehicleId ?? null,
        totalDistanceKm,
        totalDurationMinutes,
      },
    });

    return this.prisma.routeShift.findUnique({
      where: { id: updatedRoute.id },
      select: this.routeSummarySelect(),
    });
  }

  myHistory(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);

    return this.prisma.routeShift.findMany({
      where: { companyId, employeeId: user.sub },
      orderBy: { startedAt: 'desc' },
      take: 100,
      include: { vehicle: true },
    });
  }

  async active(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);

    const activeRoute = await this.prisma.routeShift.findFirst({
      where: { companyId, employeeId: user.sub, status: RouteShiftStatus.IN_PROGRESS },
      orderBy: { startedAt: 'desc' },
      select: this.routeActiveSelect(),
    });

    return activeRoute ?? null;
  }

  companyRoutes(user: AuthenticatedUser, query: CompanyRoutesQueryDto = {}) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const where: Prisma.RouteShiftWhereInput = { companyId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.vehicleId) {
      where.vehicleId = query.vehicleId;
    }

    if (query.startDate || query.endDate) {
      where.startedAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    return this.prisma.routeShift.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 200,
      select: this.routeSummarySelect(),
    });
  }

  async summary(user: AuthenticatedUser, routeShiftId: string) {
    const route = await this.ensureRouteAccess(user, routeShiftId);
    return this.prisma.routeShift.findUnique({
      where: { id: route.id },
      select: this.routeDetailSelect(),
    });
  }

  async live(user: AuthenticatedUser, routeShiftId: string) {
    const route = await this.ensureRouteAccess(user, routeShiftId);
    const routeDetail = await this.prisma.routeShift.findUnique({
      where: { id: route.id },
      select: this.routeDetailSelect(),
    });

    if (!routeDetail) {
      throw new NotFoundException('Rota nao encontrada.');
    }

    const points = routeDetail.points ?? [];
    const latestPoint = points.at(-1) ?? null;
    const startPoint = this.resolveStartPoint(routeDetail);
    const currentPoint = latestPoint ?? startPoint;
    const liveDistanceKm = calculateRouteDistanceKm(
      points.map((point) => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        accuracy: point.accuracy == null ? null : Number(point.accuracy),
        recordedAt: point.recordedAt,
      })),
    );
    const endedAt = routeDetail.endedAt ? new Date(routeDetail.endedAt) : new Date();
    const liveDurationMinutes =
      routeDetail.status === RouteShiftStatus.FINISHED
        ? routeDetail.totalDurationMinutes
        : Math.max(0, Math.round((endedAt.getTime() - routeDetail.startedAt.getTime()) / 60000));

    return {
      ...routeDetail,
      liveDistanceKm,
      liveDurationMinutes,
      pointsCount: points.length,
      latestPoint,
      startPoint,
      currentPoint,
      trackingStatus: this.resolveTrackingStatus(routeDetail.status, latestPoint?.recordedAt ?? null),
      lastPointAt: latestPoint?.recordedAt ?? null,
    };
  }

  private async ensureRouteAccess(user: AuthenticatedUser, routeShiftId: string) {
    const route = await this.prisma.routeShift.findUnique({ where: { id: routeShiftId } });
    if (!route) {
      throw new NotFoundException('Rota nao encontrada.');
    }

    if (user.role === Role.MASTER_ADMIN) {
      return route;
    }

    if (user.role === Role.COMPANY_ADMIN) {
      this.tenantScope.assertCompanyAccess(user, route.companyId);
      return route;
    }

    if (user.role === Role.EMPLOYEE && route.employeeId === user.sub) {
      this.tenantScope.assertCompanyAccess(user, route.companyId);
      return route;
    }

    throw new ForbiddenException('Acesso negado a esta rota.');
  }

  private async resolveRouteVehicleId(
    tx: Prisma.TransactionClient,
    companyId: string,
    employeeId: string,
    requestedVehicleId?: string,
  ) {
    if (requestedVehicleId) {
      await this.ensureVehicleBelongsToCompany(tx, requestedVehicleId, companyId);
      return requestedVehicleId;
    }

    const linkedVehicle = await tx.vehicle.findFirst({
      where: { companyId, employeeId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    return linkedVehicle?.id ?? null;
  }

  private async ensureVehicleBelongsToCompany(
    client: Prisma.TransactionClient,
    vehicleId: string,
    companyId: string,
  ) {
    const vehicle = await client.vehicle.findFirst({ where: { id: vehicleId, companyId }, select: { id: true } });
    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado.');
    }
  }

  private async calculateRouteCosts(companyId: string, vehicleId: string | null, totalDistanceKm: number) {
    if (!vehicleId) {
      return { estimatedFuelCost: 0, reimbursementValue: 0 };
    }

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) {
      return { estimatedFuelCost: 0, reimbursementValue: 0 };
    }

    const fuelSetting = vehicle.fuelType
      ? await this.prisma.fuelSetting.findUnique({
          where: { companyId_fuelType: { companyId, fuelType: vehicle.fuelType } },
        })
      : null;

    const costPerKm = Number(vehicle.costPerKm ?? fuelSetting?.defaultCostPerKm ?? 0);
    const averageConsumption = Number(vehicle.averageConsumption ?? 0);
    const pricePerLiter = Number(fuelSetting?.pricePerLiter ?? 0);

    if (vehicle.ownershipType === VehicleOwnershipType.EMPLOYEE) {
      return {
        estimatedFuelCost: 0,
        reimbursementValue: Number((costPerKm * totalDistanceKm).toFixed(2)),
      };
    }

    const estimatedFuelCost =
      averageConsumption > 0 && pricePerLiter > 0
        ? (totalDistanceKm / averageConsumption) * pricePerLiter
        : costPerKm * totalDistanceKm;

    return {
      estimatedFuelCost: Number(estimatedFuelCost.toFixed(2)),
      reimbursementValue: 0,
    };
  }

  private routeSummarySelect() {
    return {
      id: true,
      startedAt: true,
      endedAt: true,
      totalDistanceKm: true,
      totalDurationMinutes: true,
      estimatedFuelCost: true,
      reimbursementValue: true,
      stoppedTimeMinutes: true,
      startLatitude: true,
      startLongitude: true,
      endLatitude: true,
      endLongitude: true,
      status: true,
      employee: { select: { id: true, name: true, email: true } },
      vehicle: {
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          year: true,
          type: true,
          ownershipType: true,
          currentKm: true,
          fuelType: true,
          averageConsumption: true,
          costPerKm: true,
          status: true,
        },
      },
      _count: { select: { points: true } },
    } satisfies Prisma.RouteShiftSelect;
  }

  private routeDetailSelect() {
    return {
      ...this.routeSummarySelect(),
      points: {
        orderBy: { recordedAt: 'asc' as const },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          accuracy: true,
          speed: true,
          altitude: true,
          batteryLevel: true,
          recordedAt: true,
        },
      },
    } satisfies Prisma.RouteShiftSelect;
  }

  private routeActiveSelect() {
    return {
      ...this.routeSummarySelect(),
      serviceOrder: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    } satisfies Prisma.RouteShiftSelect;
  }

  private resolveStartPoint(route: {
    startLatitude: Prisma.Decimal | number | string | null;
    startLongitude: Prisma.Decimal | number | string | null;
    startedAt: Date;
  }) {
    if (route.startLatitude == null || route.startLongitude == null) {
      return null;
    }

    return {
      latitude: Number(route.startLatitude),
      longitude: Number(route.startLongitude),
      recordedAt: route.startedAt,
      type: 'START' as const,
    };
  }

  private resolveTrackingStatus(status: RouteShiftStatus, latestPointAt: Date | null) {
    if (status === RouteShiftStatus.FINISHED) {
      return 'FINISHED';
    }

    if (status === RouteShiftStatus.ERROR) {
      return 'ERROR';
    }

    if (!latestPointAt) {
      return 'IN_PROGRESS';
    }

    const minutesWithoutPoint = (Date.now() - latestPointAt.getTime()) / 60000;
    return minutesWithoutPoint >= PAUSED_AFTER_MINUTES_WITHOUT_POINT ? 'PAUSED' : 'IN_PROGRESS';
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
      // Auditoria nao deve impedir finalizacao da rota.
    }
  }
}
