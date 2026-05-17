import { Role } from '@prisma/client';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  companyId: string | null;
};

export type AuthenticatedUser = AuthTokenPayload;

export type AuthenticatedRefreshUser = AuthenticatedUser & {
  refreshToken: string;
};
