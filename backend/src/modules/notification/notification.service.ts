import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NOTIFICATION_QUEUE, NOTIFICATION_JOB_SEND } from './notification.constants';
import { SendNotificationPayload } from './notification.processor';
import { paginate, getPrismaSkip } from '../../common/types/pagination.types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notifQueue: Queue,
  ) {}

  async send(payload: SendNotificationPayload) {
    return this.notifQueue.add(NOTIFICATION_JOB_SEND, payload, { priority: 2 });
  }

  async getMyNotifications(userId: string, page: number, limit: number) {
    const where = { userId };
    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip: getPrismaSkip(page, limit),
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return paginate(data, total, page, limit);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  @OnEvent('reward.checkin')
  async onCheckin(payload: { userId: string; streakDay: number; totalAmount: number; walletBalance: number }) {
    await this.send({
      userId: payload.userId,
      type: NotificationType.REWARD_RECEIVED,
      title: '🎉 Daily Reward Received!',
      message: `Day ${payload.streakDay} check-in complete! +${payload.totalAmount} coins. Balance: ${payload.walletBalance}`,
      data: payload,
    });
  }

  @OnEvent('user.registered')
  async onUserRegistered(payload: { userId: string; email: string }) {
    await this.send({
      userId: payload.userId,
      type: NotificationType.SYSTEM,
      title: 'Welcome to Reward Platform!',
      message: 'Start your daily check-in streak to earn coins. Check in every day for bigger rewards!',
    });
  }

  @OnEvent('admin.userStatusChanged')
  async onUserStatusChanged(payload: { userId: string; status: string }) {
    await this.send({
      userId: payload.userId,
      type: NotificationType.SYSTEM,
      title: 'Account Status Updated',
      message: `Your account status has been updated to: ${payload.status}`,
      data: payload,
    });
  }
}
