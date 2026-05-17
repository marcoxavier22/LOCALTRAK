import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDate, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { ServiceOrderStopDto } from './service-order-stop.dto';

export class CreateServiceOrderDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @Trim()
  @IsString()
  description?: string;

  @IsOptional()
  @Trim()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @Trim()
  @IsString()
  vehicleId?: string;

  @Type(() => Date)
  @IsDate()
  scheduledDate: Date;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceOrderStopDto)
  stops: ServiceOrderStopDto[];
}
