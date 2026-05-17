import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CommonModule } from './common/common.module';
import { CompanyContextGuard } from './common/guards/company-context.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CompaniesModule } from './companies/companies.module';
import { FuelModule } from './fuel/fuel.module';
import { HealthModule } from './health/health.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoutesModule } from './routes/routes.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env.local',
        '.env.local',
        '.env',
        '../../.env',
      ],
    }),
    CommonModule,
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    VehiclesModule,
    RoutesModule,
    MaintenanceModule,
    FuelModule,
    OrdersModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CompanyContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
