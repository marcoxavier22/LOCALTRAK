import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { RoutePointDto } from './route-point.dto';

export class AddRoutePointsDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  points: RoutePointDto[];
}
