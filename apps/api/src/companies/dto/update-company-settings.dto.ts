import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsBoolean()
  requireOdometerStartPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  requireOdometerFinishPhoto?: boolean;

  @IsOptional()
  @IsBoolean()
  requireOdometerStartKm?: boolean;

  @IsOptional()
  @IsBoolean()
  requireOdometerFinishKm?: boolean;
}
