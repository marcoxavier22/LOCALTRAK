import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { OdometerPhotoDto, UploadOdometerPhotoDto } from './dto/odometer-photo.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.COMPANY_ADMIN)
  @Post('orders')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceOrderDto) {
    return this.ordersService.create(user, dto);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('orders')
  findMany(@CurrentUser() user: AuthenticatedUser, @Query() query: OrdersQueryDto) {
    return this.ordersService.findMany(user, query);
  }

  @Roles(Role.EMPLOYEE)
  @Get('orders/my-today')
  myToday(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.myToday(user);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('orders/:id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.findOne(user, id);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('orders/:id/route')
  route(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.route(user, id);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('orders/:id/odometer-photo')
  odometerPhotos(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.odometerPhotos(user, id);
  }

  @Roles(Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.EMPLOYEE)
  @Get('orders/:id/tracking')
  tracking(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.tracking(user, id);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Patch('orders/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.ordersService.update(user, id, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Post('orders/:id/upload-odometer')
  uploadOdometerPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UploadOdometerPhotoDto,
  ) {
    return this.ordersService.uploadOdometerPhoto(user, id, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Patch('orders/:id/start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: OdometerPhotoDto) {
    return this.ordersService.start(user, id, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Patch('orders/:id/finish')
  finish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: OdometerPhotoDto) {
    return this.ordersService.finish(user, id, dto);
  }

  @Roles(Role.EMPLOYEE)
  @Patch('orders/:id/stops/:stopId/complete')
  completeStop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
  ) {
    return this.ordersService.completeStop(user, id, stopId);
  }

  @Roles(Role.COMPANY_ADMIN)
  @Delete('orders/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.remove(user, id);
  }
}
