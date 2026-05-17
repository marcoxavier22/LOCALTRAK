import { MaintenanceStatus, MaintenanceType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleMaintenanceDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsOptional()
  @IsString()
  maintenanceRuleId?: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  description?: string;

  @Type(() => Date)
  @IsDate()
  performedAt?: Date;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  performedKm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}
