import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AddRoutePointsDto } from './dto/add-route-points.dto';
import { CompanyRoutesQueryDto } from './dto/company-routes-query.dto';
import { FinishRouteDto } from './dto/finish-route.dto';
import { StartRouteDto } from './dto/start-route.dto';
import { RoutesService } from './routes.service';

@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Roles(Role.EMPLOYEE)
  @Post('routes/start')
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartRouteDto) {
    return this.routesService.start(user, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Post('routes/:id/points')
  addPoints(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddRoutePointsDto,
  ) {
    return this.routesService.addPoints(user, id, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Post('routes/:id/finish')
  finish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: FinishRouteDto) {
    return this.routesService.finish(user, id, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Get('routes/my-history')
  myHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.routesService.myHistory(user);
  }

  @Roles(Role.EMPLOYEE)
  @Get('routes/active')
  active(@CurrentUser() user: AuthenticatedUser) {
    return this.routesService.active(user);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('routes/:id/summary')
  summary(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.routesService.summary(user, id);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('routes/:id/live')
  live(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.routesService.live(user, id);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('routes/:id/history')
  history(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.routesService.summary(user, id);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('routes/:id')
  routeById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.routesService.summary(user, id);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Get('company/routes')
  companyRoutes(@CurrentUser() user: AuthenticatedUser, @Query() query: CompanyRoutesQueryDto) {
    return this.routesService.companyRoutes(user, query);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Get('company/routes/:id')
  companyRouteDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.routesService.summary(user, id);
  }
}
