import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { paginate } from '../../common/types/pagination.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const stats = await this.usersRepo.getUserStats(userId);
    return { ...user, stats };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.usersRepo.update(userId, dto);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.usersRepo.update(userId, { avatarUrl });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    role?: string;
  }) {
    const { data, total } = await this.usersRepo.findMany(params);
    return paginate(data, total, params.page, params.limit);
  }

  async findById(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
