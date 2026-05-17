import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.MASTER_ADMIN)
  @Get('master/users')
  findAllMaster() {
    return this.usersService.findAll();
  }

  @Roles(Role.MASTER_ADMIN)
  @Post('master/users')
  createMasterUser(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles(Role.MASTER_ADMIN)
  @Patch('master/users/:id')
  updateMasterUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Get('company/employees')
  findCompanyEmployees(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findEmployeesByCompany(user.companyId);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Post('company/employees')
  createCompanyEmployee(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.createCompanyScoped(user.companyId, dto);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Patch('company/employees/:id')
  updateCompanyEmployee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateCompanyScoped(user.companyId, id, dto);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Patch('company/employees/:id/status')
  updateCompanyEmployeeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.usersService.updateCompanyEmployeeStatus(user.companyId, id, dto.isActive);
  }
}
