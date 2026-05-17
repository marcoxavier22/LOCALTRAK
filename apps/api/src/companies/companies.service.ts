import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/security/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        _count: { select: { users: true, vehicles: true, routeShifts: true } },
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        plan: true,
        users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        vehicles: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    return company;
  }

  async create(dto: CreateCompanyDto) {
    if (!dto.adminUser) {
      return this.prisma.company.create({
        data: this.toCompanyCreateData(dto),
      });
    }

    const adminEmail = dto.adminUser.email.toLowerCase().trim();
    const existingAdmin = await this.prisma.user.findUnique({ where: { email: adminEmail } });

    if (existingAdmin) {
      throw new ConflictException('Ja existe um usuario com este e-mail.');
    }

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: this.toCompanyCreateData(dto),
      });

      const adminUser = await tx.user.create({
        data: {
          name: dto.adminUser!.name,
          email: adminEmail,
          phone: dto.adminUser!.phone,
          passwordHash: await this.passwords.hash(dto.adminUser!.password),
          role: Role.COMPANY_ADMIN,
          companyId: company.id,
        },
        select: this.publicUserSelect(),
      });

      return { company, adminUser };
    });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  private toCompanyCreateData(dto: CreateCompanyDto) {
    return {
      name: dto.name,
      document: dto.document,
      phone: dto.phone,
      email: dto.email,
      status: dto.status ?? 'TRIAL',
      planId: dto.planId,
      maxEmployees: dto.maxEmployees ?? 5,
      maxVehicles: dto.maxVehicles ?? 5,
    };
  }

  private publicUserSelect() {
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
