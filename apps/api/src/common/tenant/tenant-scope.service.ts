import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class TenantScopeService {
  requireCompanyId(user: AuthenticatedUser): string {
    return this.requireCompanyIdValue(user.companyId);
  }

  requireCompanyIdValue(companyId: string | null | undefined): string {
    if (!companyId) {
      throw new ForbiddenException('Usuario sem empresa vinculada.');
    }

    return companyId;
  }

  companyFilter(user: AuthenticatedUser): Record<string, never> | { companyId: string } {
    if (user.role === Role.MASTER_ADMIN) {
      return {};
    }

    return { companyId: this.requireCompanyId(user) };
  }

  assertCompanyAccess(user: AuthenticatedUser, companyId: string) {
    if (user.role === Role.MASTER_ADMIN) {
      return;
    }

    if (this.requireCompanyId(user) !== companyId) {
      throw new ForbiddenException('Acesso negado aos dados desta empresa.');
    }
  }
}
