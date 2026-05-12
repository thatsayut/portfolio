import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword, comparePassword } from '../../common/utils/hash.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already registered' : 'Username already taken',
      );
    }

    const hashedPassword = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          password: hashedPassword,
          phone: dto.phone,
        },
      });

      // Auto-create wallet on registration
      await tx.wallet.create({ data: { userId: newUser.id } });

      return newUser;
    });

    this.events.emit('user.registered', { userId: user.id, email: user.email });
    this.logger.log(`New user registered: ${user.email}`);

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, ipAddress);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !(await comparePassword(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.events.emit('user.loggedIn', { userId: user.id, ipAddress });

    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(userId: string, refreshToken: string, ipAddress?: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.userId !== userId || stored.isRevoked) {
      // Token reuse detected — revoke all sessions for this user
      if (stored && !stored.isRevoked) {
        await this.revokeAllUserSessions(userId);
        this.logger.warn(`Token reuse detected for user ${userId} — all sessions revoked`);
      }
      throw new UnauthorizedException('Invalid or reused refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      ipAddress,
    );
    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!(await comparePassword(dto.currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { password: newHash } });

    // Invalidate all refresh tokens after password change
    await this.revokeAllUserSessions(userId);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email is registered, a reset link has been sent.' };

    // In production: generate a signed reset token, store it with expiry, send email
    const resetToken = uuidv4();
    this.logger.log(`Password reset requested for ${email} — token: ${resetToken}`);
    this.events.emit('auth.passwordResetRequested', { userId: user.id, token: resetToken, email });

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    // In production: validate token from DB, check expiry
    throw new BadRequestException('Reset token validation requires email service integration. See docs/decision.md.');
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  private async revokeAllUserSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  private sanitizeUser(user: any) {
    const { password: _, ...safe } = user;
    return safe;
  }
}
