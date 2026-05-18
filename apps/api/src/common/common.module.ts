import { Global, Module } from '@nestjs/common';
import { PasswordService } from './security/password.service';
import { TenantScopeService } from './tenant/tenant-scope.service';
import { GeocodingService } from './geocoding/geocoding.service';

@Global()
@Module({
  providers: [PasswordService, TenantScopeService, GeocodingService],
  exports: [PasswordService, TenantScopeService, GeocodingService],
})
export class CommonModule {}
