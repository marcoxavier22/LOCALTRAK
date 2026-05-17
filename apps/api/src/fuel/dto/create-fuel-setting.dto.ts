import { FuelType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateFuelSettingDto {
  @IsEnum(FuelType)
  fuelType: FuelType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerLiter?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultCostPerKm?: number;
}
