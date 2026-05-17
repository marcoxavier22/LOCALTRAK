import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateMaintenanceRuleDto } from './dto/create-maintenance-rule.dto';
import { CreateVehicleMaintenanceDto } from './dto/create-vehicle-maintenance.dto';
import { MaintenanceRecordsQueryDto } from './dto/maintenance-records-query.dto';
import { UpdateMaintenanceRuleDto } from './dto/update-maintenance-rule.dto';
import { MaintenanceService } from './maintenance.service';

@Roles(Role.COMPANY_ADMIN)
@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('company/maintenance/rules')
  findRules(@CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceService.findRules(user);
  }

  @Post('company/maintenance/rules')
  createRule(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMaintenanceRuleDto) {
    return this.maintenanceService.createRule(user, dto);
  }

  @Patch('company/maintenance/rules/:id')
  updateRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceRuleDto,
  ) {
    return this.maintenanceService.updateRule(user, id, dto);
  }

  @Get('company/maintenance/alerts')
  alerts(@CurrentUser() user: AuthenticatedUser) {
    return this.maintenanceService.alerts(user);
  }

  @Post('company/maintenance/records')
  createRecord(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVehicleMaintenanceDto) {
    return this.maintenanceService.createRecord(user, dto);
  }

  @Get('company/maintenance/records')
  records(@CurrentUser() user: AuthenticatedUser, @Query() query: MaintenanceRecordsQueryDto) {
    return this.maintenanceService.records(user, query);
  }

  @Get('company/vehicles/:vehicleId/maintenance')
  vehicleHistory(@CurrentUser() user: AuthenticatedUser, @Param('vehicleId') vehicleId: string) {
    return this.maintenanceService.vehicleHistory(user, vehicleId);
  }
}
