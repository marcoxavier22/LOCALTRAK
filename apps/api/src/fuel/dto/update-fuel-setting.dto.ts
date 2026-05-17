import { PartialType } from '@nestjs/mapped-types';
import { CreateFuelSettingDto } from './create-fuel-setting.dto';

export class UpdateFuelSettingDto extends PartialType(CreateFuelSettingDto) {}
