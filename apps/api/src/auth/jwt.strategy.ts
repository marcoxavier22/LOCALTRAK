import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { CompanyStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

const blockedCompanyStatuses: CompanyStatus[] = [
  CompanyStatus.BLOCKED,
  CompanyStatus.DELINQUENT,
  CompanyStatus.ARCHIVED,
];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
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

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }
}
