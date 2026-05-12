import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import * as hashUtil from '../../common/utils/hash.util';

// Mock hash utils at module level
jest.mock('../../common/utils/hash.util');
const mockedHash = hashUtil as jest.Mocked<typeof hashUtil>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwtService: Record<string, any>;
  let configService: Record<string, any>;
  let events: Record<string, any>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$12$hashedpassword',
    role: 'USER',
    status: 'ACTIVE',
    phone: null,
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          'jwt.secret': 'test-secret',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshExpiresIn': '7d',
        };
        return map[key];
      }),
    };

    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'new@example.com', username: 'newuser', password: 'pass123' };

    it('should register a new user and return tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      mockedHash.hashPassword.mockResolvedValue('$hashed$');

      const createdUser = { ...mockUser, email: dto.email, username: dto.username };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(createdUser) },
          wallet: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register(dto, '127.0.0.1');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(dto.email);
      expect(result.user.password).toBeUndefined(); // sanitized
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(events.emit).toHaveBeenCalledWith('user.registered', expect.any(Object));
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException if username already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, username: dto.username });

      await expect(service.register(dto)).rejects.toThrow('Username already taken');
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'pass123' };

    it('should login and return user + tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      mockedHash.comparePassword.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(dto, '127.0.0.1', 'Mozilla');

      expect(result.user.email).toBe(dto.email);
      expect(result.user.password).toBeUndefined();
      expect(result.accessToken).toBeDefined();
      expect(events.emit).toHaveBeenCalledWith('user.loggedIn', expect.any(Object));
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      mockedHash.comparePassword.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if account is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });
      mockedHash.comparePassword.mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow('Account is suspended');
    });
  });

  // ─── Refresh Tokens ────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    const storedToken = {
      id: 'rt-1',
      token: 'valid-refresh',
      userId: 'user-1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
      user: mockUser,
    };

    it('should rotate tokens on valid refresh', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('user-1', 'valid-refresh', '127.0.0.1');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isRevoked: true } }),
      );
    });

    it('should throw on revoked refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...storedToken, isRevoked: true });

      await expect(service.refreshTokens('user-1', 'valid-refresh')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on expired refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 86400000), // yesterday
      });

      await expect(service.refreshTokens('user-1', 'valid-refresh')).rejects.toThrow(
        'Refresh token expired',
      );
    });

    it('should revoke all sessions on token reuse (different userId)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await expect(service.refreshTokens('user-99', 'valid-refresh')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'some-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'some-refresh-token', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  // ─── Change Password ──────────────────────────────────────────────────────

  describe('changePassword', () => {
    const dto = { currentPassword: 'old', newPassword: 'new123' };

    it('should change password and revoke all sessions', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockedHash.comparePassword.mockResolvedValue(true);
      mockedHash.hashPassword.mockResolvedValue('$newhash$');
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.changePassword('user-1', dto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: '$newhash$' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should throw if current password is wrong', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockedHash.comparePassword.mockResolvedValue(false);

      await expect(service.changePassword('user-1', dto)).rejects.toThrow(BadRequestException);
      await expect(service.changePassword('user-1', dto)).rejects.toThrow(
        'Current password is incorrect',
      );
    });
  });

  // ─── Forgot Password ──────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should return generic message even if user not found (prevent enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@test.com');
      expect(result.message).toMatch(/if that email is registered/i);
    });

    it('should emit event and return message for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@example.com');
      expect(result.message).toMatch(/if that email is registered/i);
      expect(events.emit).toHaveBeenCalledWith(
        'auth.passwordResetRequested',
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });
  });
});
