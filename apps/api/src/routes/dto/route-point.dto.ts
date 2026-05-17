import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class RoutePointDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsNumber()
  batteryLevel?: number;

  @Type(() => Date)
  @IsDate()
  recordedAt: Date;
}
