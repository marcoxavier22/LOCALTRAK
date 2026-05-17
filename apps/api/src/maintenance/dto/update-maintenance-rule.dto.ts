import { PartialType } from '@nestjs/mapped-types';
import { CreateMaintenanceRuleDto } from './create-maintenance-rule.dto';

export class UpdateMaintenanceRuleDto extends PartialType(CreateMaintenanceRuleDto) {}
