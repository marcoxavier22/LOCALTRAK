import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FuelType, Prisma, ReimbursementPaymentStatus, Role, RouteShiftStatus, VehicleOwnershipType } from '@prisma/client';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFuelSettingDto } from './dto/create-fuel-setting.dto';
import { CreateReimbursementPaymentDto } from './dto/create-reimbursement-payment.dto';
import { ReimbursementPaymentsQueryDto } from './dto/reimbursement-payments-query.dto';
import { ReimbursementQueryDto } from './dto/reimbursement-query.dto';
import { UpdateFuelSettingDto } from './dto/update-fuel-setting.dto';

type ReportRoute = Prisma.RouteShiftGetPayload<{
  include: {
    employee: { select: { id: true; name: true; email: true } };
    vehicle: {
      select: {
        id: true;
        plate: true;
        brand: true;
        model: true;
        ownershipType: true;
        fuelType: true;
      };
    };
  };
}>;

@Injectable()
export class FuelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  findSettings(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);

    return this.prisma.fuelSetting.findMany({
      where: { companyId },
      orderBy: { fuelType: 'asc' },
    });
  }

  async createSetting(user: AuthenticatedUser, dto: CreateFuelSettingDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    this.ensureHasFuelRule(dto.pricePerLiter, dto.defaultCostPerKm);

    try {
      return await this.prisma.fuelSetting.create({
        data: {
          companyId,
          fuelType: dto.fuelType,
          pricePerLiter: dto.pricePerLiter,
          defaultCostPerKm: dto.defaultCostPerKm,
        },
      });
    } catch (error) {
      this.handleUniqueFuelSettingError(error);
    }
  }

  async updateSetting(user: AuthenticatedUser, id: string, dto: UpdateFuelSettingDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const existing = await this.prisma.fuelSetting.findFirst({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Configuracao de combustivel nao encontrada.');
    }

    const nextPricePerLiter =
      dto.pricePerLiter === undefined ? Number(existing.pricePerLiter ?? 0) || undefined : dto.pricePerLiter;
    const nextDefaultCostPerKm =
      dto.defaultCostPerKm === undefined
        ? Number(existing.defaultCostPerKm ?? 0) || undefined
        : dto.defaultCostPerKm;

    this.ensureHasFuelRule(nextPricePerLiter, nextDefaultCostPerKm);

    try {
      return await this.prisma.fuelSetting.update({
        where: { id },
        data: {
          fuelType: dto.fuelType,
          pricePerLiter: dto.pricePerLiter,
          defaultCostPerKm: dto.defaultCostPerKm,
        },
      });
    } catch (error) {
      this.handleUniqueFuelSettingError(error);
    }
  }

  async reimbursements(user: AuthenticatedUser, query: ReimbursementQueryDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const routes = await this.findReportRoutes(companyId, query);
    return this.buildReport(routes, query);
  }

  async employeeReimbursements(user: AuthenticatedUser, employeeId: string, query: ReimbursementQueryDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, companyId, role: Role.EMPLOYEE },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado.');
    }

    const routes = await this.findReportRoutes(companyId, query, employeeId);
    return this.buildReport(routes, query);
  }

  async reimbursementPayments(user: AuthenticatedUser, query: ReimbursementPaymentsQueryDto) {
    const companyId = this.tenantScope.requireCompanyId(user);

    return this.prisma.reimbursementPayment.findMany({
      where: {
        companyId,
        employeeId: query.employeeId,
        vehicleId: query.vehicleId,
        status: query.status,
        paidAt: this.buildPaymentDateFilter(query),
      },
      orderBy: { paidAt: 'desc' },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            ownershipType: true,
            fuelType: true,
          },
        },
      },
    });
  }

  async createReimbursementPayment(user: AuthenticatedUser, dto: CreateReimbursementPaymentDto) {
    const companyId = this.tenantScope.requireCompanyId(user);

    if (!dto.description || !dto.vehicleId || dto.distanceKm === undefined || dto.fuelCost === undefined) {
      throw new BadRequestException('Informe funcionario, veiculo, km, custo do combustivel, valor, data e descricao.');
    }

    const employee = await this.prisma.user.findFirst({
      where: { id: dto.employeeId, companyId, role: Role.EMPLOYEE },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado.');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
      select: {
        id: true,
        employeeId: true,
        plate: true,
        brand: true,
        model: true,
        ownershipType: true,
        fuelType: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado.');
    }

    if (vehicle.employeeId && vehicle.employeeId !== dto.employeeId) {
      throw new BadRequestException('O veiculo informado esta vinculado a outro funcionario.');
    }

    return this.prisma.reimbursementPayment.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        vehicleId: dto.vehicleId,
        distanceKm: dto.distanceKm,
        fuelCost: dto.fuelCost,
        amount: dto.amount,
        description: dto.description,
        paidAt: new Date(dto.paidAt),
        status: dto.status ?? ReimbursementPaymentStatus.PAID,
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            ownershipType: true,
            fuelType: true,
          },
        },
      },
    });
  }

  private findReportRoutes(companyId: string, query: ReimbursementQueryDto, employeeId?: string) {
    return this.prisma.routeShift.findMany({
      where: {
        companyId,
        employeeId: employeeId ?? query.employeeId,
        vehicleId: query.vehicleId,
        status: RouteShiftStatus.FINISHED,
        endedAt: this.buildDateFilter(query),
      },
      orderBy: { endedAt: 'desc' },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            ownershipType: true,
            fuelType: true,
          },
        },
      },
    });
  }

  private buildReport(routes: ReportRoute[], query: ReimbursementQueryDto) {
    const byEmployee = new Map<string, ReturnType<typeof this.createEmployeeRow>>();
    const byVehicle = new Map<string, ReturnType<typeof this.createVehicleRow>>();

    let totalDistanceKm = 0;
    let totalFuelCost = 0;
    let totalReimbursement = 0;
    let companyVehicleDistanceKm = 0;
    let employeeVehicleDistanceKm = 0;

    for (const route of routes) {
      const distanceKm = Number(route.totalDistanceKm);
      const estimatedFuelCost = Number(route.estimatedFuelCost);
      const reimbursementValue = Number(route.reimbursementValue);

      totalDistanceKm += distanceKm;
      totalFuelCost += estimatedFuelCost;
      totalReimbursement += reimbursementValue;

      if (route.vehicle?.ownershipType === VehicleOwnershipType.EMPLOYEE) {
        employeeVehicleDistanceKm += distanceKm;
      }

      if (route.vehicle?.ownershipType === VehicleOwnershipType.COMPANY) {
        companyVehicleDistanceKm += distanceKm;
      }

      const employeeRow = byEmployee.get(route.employeeId) ?? this.createEmployeeRow(route);
      employeeRow.routesCount += 1;
      employeeRow.totalDistanceKm += distanceKm;
      employeeRow.totalFuelCost += estimatedFuelCost;
      employeeRow.totalReimbursement += reimbursementValue;
      byEmployee.set(route.employeeId, employeeRow);

      if (route.vehicle) {
        const vehicleRow = byVehicle.get(route.vehicle.id) ?? this.createVehicleRow(route);
        vehicleRow.routesCount += 1;
        vehicleRow.totalDistanceKm += distanceKm;
        vehicleRow.totalFuelCost += estimatedFuelCost;
        vehicleRow.totalReimbursement += reimbursementValue;
        byVehicle.set(route.vehicle.id, vehicleRow);
      }
    }

    return {
      period: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
      totals: {
        routesCount: routes.length,
        totalDistanceKm: this.round(totalDistanceKm, 3),
        companyVehicleDistanceKm: this.round(companyVehicleDistanceKm, 3),
        employeeVehicleDistanceKm: this.round(employeeVehicleDistanceKm, 3),
        totalFuelCost: this.round(totalFuelCost, 2),
        totalReimbursement: this.round(totalReimbursement, 2),
      },
      byEmployee: Array.from(byEmployee.values())
        .map((row) => this.roundReportRow(row))
        .sort((a, b) => b.totalReimbursement - a.totalReimbursement),
      byVehicle: Array.from(byVehicle.values())
        .map((row) => this.roundReportRow(row))
        .sort((a, b) => b.totalDistanceKm - a.totalDistanceKm),
      routes: routes.map((route) => ({
        id: route.id,
        employee: route.employee,
        vehicle: route.vehicle,
        startedAt: route.startedAt,
        endedAt: route.endedAt,
        totalDistanceKm: route.totalDistanceKm,
        estimatedFuelCost: route.estimatedFuelCost,
        reimbursementValue: route.reimbursementValue,
      })),
    };
  }

  private createEmployeeRow(route: ReportRoute) {
    return {
      employee: route.employee,
      routesCount: 0,
      totalDistanceKm: 0,
      totalFuelCost: 0,
      totalReimbursement: 0,
    };
  }

  private createVehicleRow(route: ReportRoute) {
    return {
      vehicle: route.vehicle,
      routesCount: 0,
      totalDistanceKm: 0,
      totalFuelCost: 0,
      totalReimbursement: 0,
    };
  }

  private roundReportRow<T extends { totalDistanceKm: number; totalFuelCost: number; totalReimbursement: number }>(
    row: T,
  ) {
    return {
      ...row,
      totalDistanceKm: this.round(row.totalDistanceKm, 3),
      totalFuelCost: this.round(row.totalFuelCost, 2),
      totalReimbursement: this.round(row.totalReimbursement, 2),
    };
  }

  private buildDateFilter(query: ReimbursementQueryDto) {
    if (!query.startDate && !query.endDate) {
      return undefined;
    }

    return {
      gte: query.startDate,
      lte: query.endDate,
    };
  }

  private buildPaymentDateFilter(query: ReimbursementPaymentsQueryDto) {
    if (!query.startDate && !query.endDate) {
      return undefined;
    }

    return {
      gte: query.startDate ? new Date(query.startDate) : undefined,
      lte: query.endDate ? new Date(query.endDate) : undefined,
    };
  }

  private ensureHasFuelRule(pricePerLiter?: number | null, defaultCostPerKm?: number | null) {
    if (!pricePerLiter && !defaultCostPerKm) {
      throw new BadRequestException('Informe valor por litro, valor por km ou ambos.');
    }
  }

  private handleUniqueFuelSettingError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Ja existe configuracao para este combustivel nesta empresa.');
    }

    throw error;
  }

  private round(value: number, digits: number) {
    return Number(value.toFixed(digits));
  }
}
