import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { CompanyStatus } from '@prisma/client';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedRefreshUser, AuthTokenPayload } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

const blockedCompanyStatuses: CompanyStatus[] = [
  CompanyStatus.BLOCKED,
  CompanyStatus.DELINQUENT,
  CompanyStatus.ARCHIVED,
];

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(request: Request, payload: AuthTokenPayload): Promise<AuthenticatedRefreshUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { company: true },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException('Usuario inativo ou inexistente.');
    }

    if (user.company && blockedCompanyStatuses.includes(user.company.status)) {
      throw new UnauthorizedException('Empresa bloqueada, inadimplente ou arquivada.');
    }

    const refreshToken = request.body?.refreshToken;
    if (typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token ausente.');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      refreshToken,
    };
  }
}
