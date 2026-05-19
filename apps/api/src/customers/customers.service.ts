import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CustomerStatus, GeocodingStatus } from '@prisma/client';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type CustomerAddressInput = Pick<
  CreateCustomerDto,
  'address' | 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'country' | 'cep'
>;

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly geocodingService: GeocodingService,
  ) {}

  findAllCompany(user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);

    return this.prisma.customer.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOneCompany(user: AuthenticatedUser, id: string) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return customer;
  }

  async createCompany(user: AuthenticatedUser, dto: CreateCustomerDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const address = this.buildAddress(dto);
    this.assertCustomerAddress(address);

    const location = await this.resolveLocation(address);

    return this.prisma.customer.create({
      data: {
        companyId,
        name: dto.name,
        document: this.optional(dto.document),
        email: this.optional(dto.email),
        phone: this.optional(dto.phone),
        address,
        cep: this.optional(dto.cep),
        street: this.optional(dto.street),
        number: this.optional(dto.number),
        complement: this.optional(dto.complement),
        neighborhood: this.optional(dto.neighborhood),
        city: this.optional(dto.city),
        state: this.optional(dto.state),
        country: this.optional(dto.country) ?? 'Brasil',
        notes: this.optional(dto.notes),
        latitude: location.latitude,
        longitude: location.longitude,
        geocodingStatus: location.status,
        geocodingUpdatedAt: location.updatedAt,
        status: dto.status ?? CustomerStatus.ACTIVE,
      },
    });
  }

  async updateCompany(user: AuthenticatedUser, id: string, dto: UpdateCustomerDto) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    const mergedAddressInput: CustomerAddressInput = {
      address: dto.address ?? existing.address,
      cep: dto.cep ?? existing.cep ?? undefined,
      street: dto.street ?? existing.street ?? undefined,
      number: dto.number ?? existing.number ?? undefined,
      complement: dto.complement ?? existing.complement ?? undefined,
      neighborhood: dto.neighborhood ?? existing.neighborhood ?? undefined,
      city: dto.city ?? existing.city ?? undefined,
      state: dto.state ?? existing.state ?? undefined,
      country: dto.country ?? existing.country ?? undefined,
    };
    const address = this.buildAddress(mergedAddressInput);
    this.assertCustomerAddress(address);

    const addressChanged =
      address !== existing.address ||
      dto.cep !== undefined ||
      dto.street !== undefined ||
      dto.number !== undefined ||
      dto.complement !== undefined ||
      dto.neighborhood !== undefined ||
      dto.city !== undefined ||
      dto.state !== undefined ||
      dto.country !== undefined;

    const location = addressChanged
        ? await this.resolveLocation(address)
        : {
            latitude: existing.latitude,
            longitude: existing.longitude,
            status: existing.geocodingStatus,
            updatedAt: existing.geocodingUpdatedAt,
          };

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        document: dto.document !== undefined ? this.optional(dto.document) : undefined,
        email: dto.email !== undefined ? this.optional(dto.email) : undefined,
        phone: dto.phone !== undefined ? this.optional(dto.phone) : undefined,
        address,
        cep: dto.cep !== undefined ? this.optional(dto.cep) : undefined,
        street: dto.street !== undefined ? this.optional(dto.street) : undefined,
        number: dto.number !== undefined ? this.optional(dto.number) : undefined,
        complement: dto.complement !== undefined ? this.optional(dto.complement) : undefined,
        neighborhood: dto.neighborhood !== undefined ? this.optional(dto.neighborhood) : undefined,
        city: dto.city !== undefined ? this.optional(dto.city) : undefined,
        state: dto.state !== undefined ? this.optional(dto.state) : undefined,
        country: dto.country !== undefined ? this.optional(dto.country) ?? 'Brasil' : undefined,
        notes: dto.notes !== undefined ? this.optional(dto.notes) : undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        geocodingStatus: location.status,
        geocodingUpdatedAt: location.updatedAt,
        status: dto.status,
      },
    });
  }

  async updateStatusCompany(user: AuthenticatedUser, id: string, status: CustomerStatus) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return this.prisma.customer.update({
      where: { id },
      data: { status },
    });
  }

  async deleteCompany(user: AuthenticatedUser, id: string) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const existing = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: CustomerStatus.INACTIVE },
    });

    return { success: true };
  }

  async bulkImport(user: AuthenticatedUser, list: CreateCustomerDto[]) {
    const companyId = this.tenantScope.requireCompanyId(user);

    if (!Array.isArray(list)) {
      throw new BadRequestException('A lista de importacao de clientes deve ser um array.');
    }

    if (list.length > 1000) {
      throw new BadRequestException('Limite maximo de 1000 clientes por lote excedido.');
    }

    let imported = 0;
    const rowsWithErrors: Array<{ row: number; errors: string[] }> = [];

    for (const [index, item] of list.entries()) {
      const errors = this.validateImportRow(item);
      if (errors.length > 0) {
        rowsWithErrors.push({ row: index + 1, errors });
        continue;
      }

      try {
        const address = this.buildAddress(item);
        await this.prisma.customer.create({
          data: {
            companyId,
            name: item.name.trim(),
            document: this.optional(item.document),
            email: this.optional(item.email),
            phone: this.optional(item.phone),
            address,
            cep: this.optional(item.cep),
            street: this.optional(item.street),
            number: this.optional(item.number),
            complement: this.optional(item.complement),
            neighborhood: this.optional(item.neighborhood),
            city: this.optional(item.city),
            state: this.optional(item.state),
            country: this.optional(item.country) ?? 'Brasil',
            notes: this.optional(item.notes),
            geocodingStatus: GeocodingStatus.PENDING,
            status: CustomerStatus.ACTIVE,
          },
        });
        imported++;
      } catch (error) {
        this.logger.error(`Falha ao importar cliente na linha ${index + 1}`, error);
        rowsWithErrors.push({ row: index + 1, errors: ['Falha ao salvar cliente.'] });
      }
    }

    const skipped = rowsWithErrors.length;
    return {
      success: skipped === 0,
      totalRows: list.length,
      imported,
      skipped,
      failed: skipped,
      errors: rowsWithErrors.length,
      rowsWithErrors,
    };
  }

  buildAddress(input: CustomerAddressInput) {
    const explicitAddress = this.optional(input.address);
    if (explicitAddress) {
      return explicitAddress;
    }

    const line = [input.street, input.number].map((part) => this.optional(part)).filter(Boolean).join(', ');
    const area = [input.neighborhood, input.city, input.state].map((part) => this.optional(part)).filter(Boolean).join(' - ');
    const country = this.optional(input.country) ?? 'Brasil';
    return [line, area, country].filter(Boolean).join(', ');
  }

  private async resolveLocation(address: string) {
    const resolved = await this.geocodingService.geocode(address);
    if (resolved) {
      return {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        status: GeocodingStatus.RESOLVED,
        updatedAt: new Date(),
      };
    }

    return {
      latitude: null,
      longitude: null,
      status: GeocodingStatus.FAILED,
      updatedAt: new Date(),
    };
  }

  private validateImportRow(item: CreateCustomerDto) {
    const errors: string[] = [];

    if (!item.name?.trim()) {
      errors.push('Nome obrigatorio.');
    }

    const address = this.buildAddress(item);
    if (!address.trim()) {
      errors.push('Endereco obrigatorio.');
    }

    if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
      errors.push('Email invalido.');
    }

    return errors;
  }

  private assertCustomerAddress(address: string) {
    if (!address.trim()) {
      throw new BadRequestException('Informe um endereco completo ou os campos estruturados do endereco.');
    }
  }

  private optional(value?: string | null) {
    const normalized = typeof value === 'string' ? value.trim() : value;
    return normalized || null;
  }
}
