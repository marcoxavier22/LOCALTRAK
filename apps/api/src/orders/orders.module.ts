import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersStorageService } from './orders-storage.service';
import { OrdersService } from './orders.service';

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersStorageService],
})
export class OrdersModule {}
