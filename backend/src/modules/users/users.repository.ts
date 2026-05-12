import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getPrismaSkip } from '../../common/types/pagination.types';

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  phone: true,
  avatarUrl: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  }

  async findMany(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    role?: string;
  }) {
    const where: Prisma.UserWhereInput = {};

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { username: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.status) where.status = params.status as any;
    if (params.role) where.role = params.role as any;

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip: getPrismaSkip(params.page, params.limit),
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async getUserStats(userId: string) {
    const [checkinCount, currentStreak, wallet] = await Promise.all([
      this.prisma.checkinHistory.count({ where: { userId } }),
      this.getCurrentStreak(userId),
      this.prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true, totalEarned: true },
      }),
    ]);

    return { checkinCount, currentStreak, wallet };
  }

  private async getCurrentStreak(userId: string) {
    const latest = await this.prisma.checkinHistory.findFirst({
      where: { userId },
      orderBy: { checkinDate: 'desc' },
      select: { streakDay: true, checkinDate: true },
    });

    if (!latest) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastCheckin = new Date(latest.checkinDate);
    lastCheckin.setHours(0, 0, 0, 0);

    // Streak is live if last check-in was today or yesterday
    if (lastCheckin >= yesterday) return latest.streakDay;
    return 0;
  }
}
