import { MaintenanceType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaintenanceRuleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
