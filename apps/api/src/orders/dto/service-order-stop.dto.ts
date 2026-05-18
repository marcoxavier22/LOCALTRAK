import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export class ServiceOrderStopDto {
  @IsOptional()
  @Trim()
  @IsString()
  customerId?: string;

  @IsOptional()
  @Trim()
  @IsString()
  customerName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @Trim()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @Trim()
  @IsString()
  address?: string;

  @IsOptional()
  @Trim()
  @IsString()
  cep?: string;

  @IsOptional()
  @Trim()
  @IsString()
  street?: string;

  @IsOptional()
  @Trim()
  @IsString()
  number?: string;

  @IsOptional()
  @Trim()
  @IsString()
  complement?: string;

  @IsOptional()
  @Trim()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @Trim()
  @IsString()
  city?: string;

  @IsOptional()
  @Trim()
  @IsString()
  state?: string;

  @IsOptional()
  @Trim()
  @IsString()
  country?: string;

  @IsOptional()
  @Trim()
  @IsString()
  addressReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  visitOrder: number;
}
