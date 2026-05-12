import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Record<string, any>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    phone: null,
    avatarUrl: null,
    role: 'USER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStats = {
    checkinCount: 10,
    currentStreak: 3,
    wallet: { balance: '150.00', totalEarned: '200.00' },
  };

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue(mockUser),
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      findMany: jest.fn().mockResolvedValue({ data: [mockUser], total: 1 }),
      update: jest.fn().mockResolvedValue(mockUser),
      getUserStats: jest.fn().mockResolvedValue(mockStats),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return user profile with stats', async () => {
      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.stats).toEqual(mockStats);
      expect(repo.findById).toHaveBeenCalledWith('user-1');
      expect(repo.getUserStats).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getProfile('nonexistent')).rejects.toThrow('User not found');
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should update and return the user', async () => {
      const dto = { username: 'newname' };
      repo.update.mockResolvedValue({ ...mockUser, username: 'newname' });

      const result = await service.updateProfile('user-1', dto as any);

      expect(result.username).toBe('newname');
      expect(repo.update).toHaveBeenCalledWith('user-1', dto);
    });
  });

  // ─── updateAvatar ─────────────────────────────────────────────────────────

  describe('updateAvatar', () => {
    it('should update avatar URL', async () => {
      const url = 'https://cdn.example.com/avatar.jpg';
      repo.update.mockResolvedValue({ ...mockUser, avatarUrl: url });

      const result = await service.updateAvatar('user-1', url);

      expect(result.avatarUrl).toBe(url);
      expect(repo.update).toHaveBeenCalledWith('user-1', { avatarUrl: url });
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated user list', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 1 });
    });

    it('should pass search/filter params to repo', async () => {
      await service.findAll({ page: 1, limit: 10, search: 'test', role: 'ADMIN' });

      expect(repo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test', role: 'ADMIN' }),
      );
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return user by id', async () => {
      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
