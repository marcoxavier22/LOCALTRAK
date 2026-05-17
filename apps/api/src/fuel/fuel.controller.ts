import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateFuelSettingDto } from './dto/create-fuel-setting.dto';
import { CreateReimbursementPaymentDto } from './dto/create-reimbursement-payment.dto';
import { ReimbursementPaymentsQueryDto } from './dto/reimbursement-payments-query.dto';
import { ReimbursementQueryDto } from './dto/reimbursement-query.dto';
import { UpdateFuelSettingDto } from './dto/update-fuel-setting.dto';
import { FuelService } from './fuel.service';

@Roles(Role.COMPANY_ADMIN)
@Controller()
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Get('company/fuel/settings')
  findSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.fuelService.findSettings(user);
  }

  @Post('company/fuel/settings')
  createSetting(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFuelSettingDto) {
    return this.fuelService.createSetting(user, dto);
  }

  @Patch('company/fuel/settings/:id')
  updateSetting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFuelSettingDto,
  ) {
    return this.fuelService.updateSetting(user, id, dto);
  }

  @Get('company/reimbursements')
  reimbursements(@CurrentUser() user: AuthenticatedUser, @Query() query: ReimbursementQueryDto) {
    return this.fuelService.reimbursements(user, query);
  }

  @Get('company/reimbursements/payments')
  reimbursementPayments(@CurrentUser() user: AuthenticatedUser, @Query() query: ReimbursementPaymentsQueryDto) {
    return this.fuelService.reimbursementPayments(user, query);
  }

  @Post('company/reimbursements/payments')
  createReimbursementPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReimbursementPaymentDto,
  ) {
    return this.fuelService.createReimbursementPayment(user, dto);
  }

  @Get('company/reimbursements/employee/:employeeId')
  employeeReimbursements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() query: ReimbursementQueryDto,
  ) {
    return this.fuelService.employeeReimbursements(user, employeeId, query);
  }
}
