import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export class ServiceOrderStopDto {
  @IsOptional()
  @Trim()
  @IsString()
  customerName?: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  address: string;

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
