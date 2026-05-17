import { Global, Module } from '@nestjs/common';
import { PasswordService } from './security/password.service';
import { TenantScopeService } from './tenant/tenant-scope.service';

@Global()
@Module({
  providers: [PasswordService, TenantScopeService],
  exports: [PasswordService, TenantScopeService],
})
export class CommonModule {}
