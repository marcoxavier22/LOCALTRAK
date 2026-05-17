import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, VehicleStatus } from '@prisma/client';
import { isPrismaKnownRequestError } from '../common/prisma-errors';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  findAllCompany(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);

    return this.prisma.vehicle.findMany({
      where: { companyId },
      orderBy: [{ plate: 'asc' }, { createdAt: 'desc' }],
      include: this.vehicleInclude(),
    });
  }

  async createCompany(user: AuthenticatedUser, dto: CreateVehicleDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const plate = this.normalizePlate(dto.plate);
    const employeeId = this.normalizeOptionalId(dto.employeeId);

    await this.ensurePlateAvailable(companyId, plate);
    if (employeeId) {
      await this.ensureEmployeeBelongsToCompany(employeeId, companyId);
    }

    try {
      return await this.prisma.vehicle.create({
        data: {
          companyId,
          employeeId,
          plate,
          brand: dto.brand,
          model: dto.model,
          year: dto.year,
          type: dto.type,
          ownershipType: dto.ownershipType,
          currentKm: dto.currentKm,
          fuelType: dto.fuelType,
          averageConsumption: dto.averageConsumption,
          costPerKm: dto.costPerKm,
          status: dto.status,
        },
        include: this.vehicleInclude(),
      });
    } catch (error) {
      this.handleUniquePlateError(error);
    }
  }

  async findOneCompany(user: AuthenticatedUser, id: string) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: this.vehicleInclude(),
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo nao encontrado.');
    }

    return vehicle;
  }

  async updateCompany(user: AuthenticatedUser, id: string, dto: UpdateVehicleDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const existing = await this.prisma.vehicle.findFirst({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Veiculo nao encontrado.');
    }

    const plate = dto.plate ? this.normalizePlate(dto.plate) : undefined;
    const employeeId =
      dto.employeeId === undefined ? undefined : this.normalizeOptionalId(dto.employeeId);

    if (plate) {
      await this.ensurePlateAvailable(companyId, plate, id);
    }

    if (employeeId) {
      await this.ensureEmployeeBelongsToCompany(employeeId, companyId);
    }

    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data: {
          employeeId,
          plate,
          brand: dto.brand,
          model: dto.model,
          year: dto.year,
          type: dto.type,
          ownershipType: dto.ownershipType,
          currentKm: dto.currentKm,
          fuelType: dto.fuelType,
          averageConsumption: dto.averageConsumption,
          costPerKm: dto.costPerKm,
          status: dto.status,
        },
        include: this.vehicleInclude(),
      });
    } catch (error) {
      this.handleUniquePlateError(error);
    }
  }

  updateCompanyStatus(user: AuthenticatedUser, id: string, status: VehicleStatus) {
    return this.updateCompany(user, id, { status });
  }

  private async ensurePlateAvailable(companyId: string, plate: string, ignoredVehicleId?: string) {
    const existing = await this.prisma.vehicle.findFirst({ where: { companyId, plate } });

    if (existing && existing.id !== ignoredVehicleId) {
      throw new ConflictException('Ja existe um veiculo com esta placa nesta empresa.');
    }
  }

  private async ensureEmployeeBelongsToCompany(employeeId: string, companyId: string) {
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, companyId, role: Role.EMPLOYEE },
      select: { id: true },
    });

    if (!employee) {
      throw new BadRequestException('Funcionario informado nao pertence a esta empresa.');
    }
  }

  private normalizePlate(plate: string) {
    return plate.trim().toUpperCase();
  }

  private normalizeOptionalId(id: string | null | undefined) {
    if (typeof id !== 'string') {
      return id ?? null;
    }

    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private handleUniquePlateError(error: unknown): never {
    if (isPrismaKnownRequestError(error) && error.code === 'P2002') {
      throw new ConflictException('Ja existe um veiculo com esta placa nesta empresa.');
    }

    throw error;
  }

  private vehicleInclude() {
    return {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
    } as const;
  }
}
