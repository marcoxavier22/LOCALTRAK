import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

export class OdometerPhotoDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsString()
  photoBase64?: string;

  @IsOptional()
  @Trim()
  @IsString()
  photoContentType?: string;

  @IsOptional()
  @Trim()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class UploadOdometerPhotoDto extends OdometerPhotoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['START', 'FINISH'])
  stage: 'START' | 'FINISH';

  @IsString()
  @IsNotEmpty()
  photoBase64: string;
}
