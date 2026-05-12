import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus, UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RewardRepository } from '../reward/reward.repository';
import { UpdateCheckinConfigDto } from '../reward/dto/update-config.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly rewardRepo: RewardRepository,
    private readonly events: EventEmitter2,
  ) {}

  async getOverviewAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      totalCheckins,
      totalRewardsDistributed,
      rewardsLast30Days,
      newUsersLast30Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.checkinHistory.count(),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { amount: { gt: 0 } },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: thirtyDaysAgo }, amount: { gt: 0 } },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalCheckins,
      totalRewardsDistributed: Number(totalRewardsDistributed._sum.amount ?? 0),
      rewardsLast30Days: Number(rewardsLast30Days._sum.amount ?? 0),
      newUsersLast30Days,
    };
  }

  async getCheckinAnalytics(from: Date, to: Date) {
    const analytics = await this.rewardRepo.getAnalytics(from, to);
    return analytics.map((row) => ({
      date: row.checkinDate,
      count: row._count._all,
      totalReward: Number(row._sum.totalAmount ?? 0),
    }));
  }

  async getWalletAnalytics() {
    const [totalBalance, topEarners] = await Promise.all([
      this.prisma.wallet.aggregate({ _sum: { balance: true, totalEarned: true } }),
      this.prisma.wallet.findMany({
        take: 10,
        orderBy: { totalEarned: 'desc' },
        include: { user: { select: { username: true, email: true } } },
      }),
    ]);

    return {
      totalBalance: Number(totalBalance._sum.balance ?? 0),
      totalEarned: Number(totalBalance._sum.totalEarned ?? 0),
      topEarners: topEarners.map((w) => ({
        username: w.user.username,
        email: w.user.email,
        totalEarned: Number(w.totalEarned),
        balance: Number(w.balance),
      })),
    };
  }

  async setUserStatus(adminId: string, userId: string, status: UserStatus) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, email: true, username: true, status: true },
    });

    this.events.emit('admin.userStatusChanged', { adminId, userId, status });
    return user;
  }

  async setUserRole(adminId: string, userId: string, role: UserRole) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, username: true, role: true },
    });

    this.events.emit('admin.userRoleChanged', { adminId, userId, role });
    return user;
  }

  async updateCheckinConfig(adminId: string, dto: UpdateCheckinConfigDto) {
    const config = await this.rewardRepo.upsertConfig({
      name: dto.name,
      baseRewardAmount: dto.baseRewardAmount,
      resetOnMissedDay: dto.resetOnMissedDay,
      maxStreakDay: dto.maxStreakDay,
    });

    if (dto.rules?.length) {
      await Promise.all(
        dto.rules.map((rule) =>
          this.rewardRepo.upsertRewardRule(config.id, rule),
        ),
      );
    }

    this.events.emit('admin.configUpdated', { adminId, configId: config.id });
    return config;
  }

  async listUsers(params: { page: number; limit: number; search?: string; status?: string }) {
    return this.usersService.findAll(params);
  }
}
