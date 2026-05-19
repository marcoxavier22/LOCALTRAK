import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantScopeService } from '../common/tenant/tenant-scope.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('company/settings')
export class CompanySettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get()
  @Roles(Role.COMPANY_ADMIN, Role.EMPLOYEE)
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        requireOdometerStartPhoto: true,
        requireOdometerFinishPhoto: true,
        requireOdometerStartKm: true,
        requireOdometerFinishKm: true,
      },
    });
    return company;
  }

  @Patch()
  @Roles(Role.COMPANY_ADMIN)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    const companyId = this.tenantScope.requireCompanyId(user);
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: dto,
      select: {
        id: true,
        name: true,
        requireOdometerStartPhoto: true,
        requireOdometerFinishPhoto: true,
        requireOdometerStartKm: true,
        requireOdometerFinishKm: true,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user.sub,
          companyId: companyId,
          action: 'UPDATE_COMPANY_SETTINGS',
          entity: 'Company',
          entityId: companyId,
          metadata: dto as Record<string, any>,
        },
      });
    } catch {
      // Falha de auditoria nao deve bloquear a resposta de sucesso
    }

    return updated;
  }
}
