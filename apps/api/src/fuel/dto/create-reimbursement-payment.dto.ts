import { ReimbursementPaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateReimbursementPaymentDto {
  @IsString()
  employeeId: string;

  @IsString()
  vehicleId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelCost: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  description?: string;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsEnum(ReimbursementPaymentStatus)
  status?: ReimbursementPaymentStatus;
}
