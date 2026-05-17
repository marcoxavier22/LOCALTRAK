import { FuelType, VehicleOwnershipType, VehicleStatus, VehicleType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateVehicleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  plate: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  brand: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  model: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsEnum(VehicleType)
  type: VehicleType;

  @IsEnum(VehicleOwnershipType)
  ownershipType: VehicleOwnershipType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentKm?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averageConsumption?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPerKm?: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsString()
  employeeId?: string | null;
}
