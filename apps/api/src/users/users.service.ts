import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/security/password.service';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
        company: { select: { id: true, name: true, status: true } },
      },
    });
  }

  async findEmployeesByCompany(companyId: string | null) {
    const scopedCompanyId = this.tenantScope.requireCompanyIdValue(companyId);

    return this.prisma.user.findMany({
      where: { companyId: scopedCompanyId, role: Role.EMPLOYEE },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        vehicles: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    this.validateCompanyRequirement(dto.role, dto.companyId);
    await this.ensureCompanyExistsWhenNeeded(dto.role, dto.companyId);
    const email = dto.email.toLowerCase().trim();
    await this.ensureEmailAvailable(email);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        phone: dto.phone,
        passwordHash: await this.passwords.hash(dto.password),
        role: dto.role,
        companyId: dto.companyId,
      },
      select: this.publicSelect(),
    });
  }

  async createCompanyScoped(companyId: string | null, dto: CreateUserDto) {
    const scopedCompanyId = this.tenantScope.requireCompanyIdValue(companyId);

    return this.create({
      ...dto,
      role: Role.EMPLOYEE,
      companyId: scopedCompanyId,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    const nextRole = dto.role ?? existing.role;
    const nextCompanyId =
      nextRole === Role.MASTER_ADMIN
        ? undefined
        : dto.companyId === undefined
          ? existing.companyId ?? undefined
          : dto.companyId;
    this.validateCompanyRequirement(nextRole, nextCompanyId);
    await this.ensureCompanyExistsWhenNeeded(nextRole, nextCompanyId);
    const email = dto.email?.toLowerCase().trim();

    if (email) {
      await this.ensureEmailAvailable(email, id);
    }

    const data = {
      name: dto.name,
      email,
      phone: dto.phone,
      role: dto.role,
      companyId: nextRole === Role.MASTER_ADMIN ? null : dto.companyId,
      isActive: dto.isActive,
      passwordHash: dto.password ? await this.passwords.hash(dto.password) : undefined,
    };

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.publicSelect(),
    });
  }

  async updateCompanyEmployeeStatus(companyId: string | null, id: string, isActive: boolean) {
    return this.updateCompanyScoped(companyId, id, { isActive });
  }

  async updateCompanyScoped(companyId: string | null, id: string, dto: UpdateUserDto) {
    const scopedCompanyId = this.tenantScope.requireCompanyIdValue(companyId);

    const user = await this.prisma.user.findFirst({
      where: { id, companyId: scopedCompanyId, role: Role.EMPLOYEE },
    });
    if (!user) {
      throw new NotFoundException('Funcionario nao encontrado.');
    }

    return this.update(id, {
      ...dto,
      role: Role.EMPLOYEE,
      companyId: scopedCompanyId,
    });
  }

  private validateCompanyRequirement(role: Role, companyId?: string) {
    if (role === Role.MASTER_ADMIN && companyId) {
      throw new BadRequestException('Admin Master nao deve estar vinculado a uma empresa.');
    }

    if (role !== Role.MASTER_ADMIN && !companyId) {
      throw new BadRequestException('Usuarios de empresa precisam de companyId.');
    }
  }

  private async ensureCompanyExistsWhenNeeded(role: Role, companyId?: string) {
    if (role === Role.MASTER_ADMIN || !companyId) {
      return;
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException('Empresa informada nao existe.');
    }
  }

  private async ensureEmailAvailable(email: string, ignoredUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing && existing.id !== ignoredUserId) {
      throw new ConflictException('Ja existe um usuario com este e-mail.');
    }
  }

  private publicSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      companyId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}
