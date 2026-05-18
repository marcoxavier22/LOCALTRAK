import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompanySettingsController } from './company-settings.controller';
import { CompaniesService } from './companies.service';

@Module({
  controllers: [CompaniesController, CompanySettingsController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
