import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser } from './types/authenticated-user.type';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; code: string; name: string };
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: { id: user.role.id, code: user.role.code, name: user.role.name },
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async issueTokens(userId: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshDays = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 7);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokens = await this.issueTokens(user.id, meta);
    return { ...tokens, user: toAuthenticatedUser(user) };
  }

  async refresh(refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (!stored.user.active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Rotacion: se revoca el token usado y se emite un par nuevo. Si alguien reutiliza
    // un refresh token ya revocado, esta misma verificacion de arriba lo va a rechazar.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const tokens = await this.issueTokens(stored.userId, meta);
    return { ...tokens, user: toAuthenticatedUser(stored.user) };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return toAuthenticatedUser(user);
  }
}
