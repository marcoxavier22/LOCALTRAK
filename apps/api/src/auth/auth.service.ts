import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CompanyStatus, Prisma, User } from '@prisma/client';
import { PasswordService } from '../common/security/password.service';
import { AuthenticatedRefreshUser, AuthTokenPayload } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

type UserWithCompany = Prisma.UserGetPayload<{ include: { company: true } }>;

const blockedCompanyStatuses: CompanyStatus[] = [
  CompanyStatus.BLOCKED,
  CompanyStatus.DELINQUENT,
  CompanyStatus.ARCHIVED,
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { company: true },
    });

    if (!user || !(await this.passwords.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    this.assertCanAuthenticate(user);

    const tokens = await this.issueTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    await this.writeAuditLog({
      userId: user.id,
      companyId: user.companyId,
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: user.id,
      metadata: { role: user.role },
    });

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  async refresh(authUser: AuthenticatedRefreshUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.sub },
      include: { company: true },
    });

    if (
      !user?.refreshTokenHash ||
      !(await this.passwords.compare(authUser.refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    this.assertCanAuthenticate(user);

    const tokens = await this.issueTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }

  private async issueTokens(user: Pick<User, 'id' | 'email' | 'role' | 'companyId'>) {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: await this.passwords.hash(refreshToken) },
    });
  }

  private assertCanAuthenticate(user: UserWithCompany) {
    if (!user.isActive) {
      throw new ForbiddenException('Usuario bloqueado.');
    }

    if (user.company && blockedCompanyStatuses.includes(user.company.status)) {
      throw new ForbiddenException('Empresa bloqueada, inadimplente ou arquivada.');
    }
  }

  private toPublicUser(user: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'companyId'>) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyId: user.companyId,
    };
  }

  private async writeAuditLog(params: {
    userId?: string | null;
    companyId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          companyId: params.companyId ?? null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId ?? null,
          metadata: params.metadata ?? {},
        },
      });
    } catch {
      // Falha de auditoria nao deve expor detalhes nem bloquear login valido.
    }
  }
}
