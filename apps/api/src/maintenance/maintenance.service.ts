import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, Prisma } from '@prisma/client';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceRuleDto } from './dto/create-maintenance-rule.dto';
import { CreateVehicleMaintenanceDto } from './dto/create-vehicle-maintenance.dto';
import { MaintenanceRecordsQueryDto } from './dto/maintenance-records-query.dto';
import { UpdateMaintenanceRuleDto } from './dto/update-maintenance-rule.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  findRules(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);

    return this.prisma.maintenanceRule.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  createRule(user: AuthenticatedUser, dto: CreateMaintenanceRuleDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    this.ensureRuleHasInterval(dto.intervalKm, dto.intervalDays);

    return this.prisma.maintenanceRule.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        intervalKm: dto.intervalKm,
        intervalDays: dto.intervalDays,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRule(user: AuthenticatedUser, id: string, dto: UpdateMaintenanceRuleDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const existing = await this.prisma.maintenanceRule.findFirst({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Regra de manutencao nao encontrada.');
    }

    this.ensureRuleHasInterval(
      dto.intervalKm === undefined ? existing.intervalKm ?? undefined : dto.intervalKm,
      dto.intervalDays === undefined ? existing.intervalDays ?? undefined : dto.intervalDays,
    );

    return this.prisma.maintenanceRule.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        intervalKm: dto.intervalKm,
        intervalDays: dto.intervalDays,
        isActive: dto.isActive,
      },
    });
  }

  async alerts(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const records = await this.prisma.vehicleMaintenance.findMany({
      where: {
        companyId,
        status: { not: MaintenanceStatus.CANCELED },
        maintenanceRule: { isActive: true },
      },
      include: {
        maintenanceRule: true,
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            currentKm: true,
            status: true,
          },
        },
      },
    });

    const latestRecords = this.getLatestRecordByVehicleAndRule(records);
    const now = new Date();

    return latestRecords
      .map((record) => {
        const currentKm = Number(record.vehicle.currentKm);
        const nextDueKm = record.nextDueKm ?? null;
        const nextDueDate = record.nextDueDate ?? null;
        const dueByKm = nextDueKm !== null && currentKm >= nextDueKm;
        const dueByDate = nextDueDate !== null && nextDueDate.getTime() <= now.getTime();

        if (!dueByKm && !dueByDate) {
          return null;
        }

        return {
          id: `${record.vehicleId}-${record.maintenanceRuleId ?? record.id}`,
          vehicle: record.vehicle,
          rule: record.maintenanceRule,
          record: {
            id: record.id,
            performedAt: record.performedAt,
            performedKm: record.performedKm,
            nextDueKm,
            nextDueDate,
            status: record.status,
          },
          currentKm,
          nextDueKm,
          nextDueDate,
          dueByKm,
          dueByDate,
          overdueKm: dueByKm && nextDueKm !== null ? Number((currentKm - nextDueKm).toFixed(2)) : 0,
          daysOverdue:
            dueByDate && nextDueDate !== null
              ? Math.max(0, Math.floor((now.getTime() - nextDueDate.getTime()) / 86400000))
              : 0,
        };
      })
      .filter(Boolean);
  }

  async createRecord(user: AuthenticatedUser, dto: CreateVehicleMaintenanceDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const vehicle = await this.ensureVehicleBelongsToCompany(dto.vehicleId, companyId);
    const rule = dto.maintenanceRuleId
      ? await this.ensureRuleBelongsToCompany(dto.maintenanceRuleId, companyId)
      : null;

    if (!dto.description || !dto.performedAt || dto.performedKm === undefined || dto.cost === undefined) {
      throw new BadRequestException('Informe veiculo, tipo, km atual, data, descricao e custo da manutencao.');
    }

    const performedAt = dto.performedAt;
    const performedKm = dto.performedKm;
    const type = rule?.type ?? dto.type;

    return this.prisma.vehicleMaintenance.create({
      data: {
        companyId,
        vehicleId: vehicle.id,
        maintenanceRuleId: rule?.id,
        type,
        description: dto.description,
        performedAt,
        performedKm,
        nextDueKm: rule?.intervalKm ? performedKm + rule.intervalKm : null,
        nextDueDate: rule?.intervalDays ? this.addDays(performedAt, rule.intervalDays) : null,
        cost: dto.cost,
        status: dto.status ?? MaintenanceStatus.DONE,
      },
      include: this.recordInclude(),
    });
  }

  async records(user: AuthenticatedUser, query: MaintenanceRecordsQueryDto) {
    const companyId = this.tenantScope.requireCompanyId(user);

    const where: Prisma.VehicleMaintenanceWhereInput = {
      companyId,
      vehicleId: query.vehicleId,
      type: query.type,
      status: query.status,
      vehicle: query.employeeId ? { employeeId: query.employeeId } : undefined,
      performedAt:
        query.startDate || query.endDate
          ? {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            }
          : undefined,
    };

    return this.prisma.vehicleMaintenance.findMany({
      where,
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      take: 300,
      include: this.recordInclude(),
    });
  }

  async vehicleHistory(user: AuthenticatedUser, vehicleId: string) {
    const companyId = this.tenantScope.requireCompanyId(user);
    await this.ensureVehicleBelongsToCompany(vehicleId, companyId);

    return this.prisma.vehicleMaintenance.findMany({
      where: { companyId, vehicleId },
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      include: this.recordInclude(),
    });
  }

  private ensureRuleHasInterval(intervalKm?: number | null, intervalDays?: number | null) {
    if (!intervalKm && !intervalDays) {
      throw new BadRequestException('Informe intervalo por km, por dias ou ambos.');
    }
  }

  private async ensureVehicleBelongsToCompany(vehicleId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      select: { id: true, plate: true, brand: true, model: true, currentKm: true, status: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado.');
    }

    return vehicle;
  }

  private async ensureRuleBelongsToCompany(ruleId: string, companyId: string) {
    const rule = await this.prisma.maintenanceRule.findFirst({ where: { id: ruleId, companyId } });

    if (!rule) {
      throw new NotFoundException('Regra de manutencao nao encontrada.');
    }

    return rule;
  }

  private getLatestRecordByVehicleAndRule(
    records: Array<
      Prisma.VehicleMaintenanceGetPayload<{
        include: {
          maintenanceRule: true;
          vehicle: {
            select: {
              id: true;
              plate: true;
              brand: true;
              model: true;
              currentKm: true;
              status: true;
            };
          };
        };
      }>
    >,
  ) {
    const latestRecords = new Map<string, (typeof records)[number]>();

    for (const record of records) {
      if (!record.maintenanceRuleId || !record.maintenanceRule) {
        continue;
      }

      const key = `${record.vehicleId}:${record.maintenanceRuleId}`;
      const current = latestRecords.get(key);
      const recordTime = record.performedAt?.getTime() ?? 0;
      const currentTime = current?.performedAt?.getTime() ?? 0;

      if (!current || recordTime >= currentTime) {
        latestRecords.set(key, record);
      }
    }

    return Array.from(latestRecords.values());
  }

  private addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private recordInclude() {
    return {
      maintenanceRule: true,
      vehicle: {
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          currentKm: true,
          status: true,
          employeeId: true,
          employee: { select: { id: true, name: true, email: true } },
        },
      },
    } satisfies Prisma.VehicleMaintenanceInclude;
  }
}
