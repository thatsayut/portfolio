import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationType } from '@prisma/client';
import { NOTIFICATION_QUEUE, NOTIFICATION_JOB_SEND } from './notification.constants';
import { PrismaService } from '../../database/prisma.service';

export interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<SendNotificationPayload>): Promise<void> {
    if (job.name !== NOTIFICATION_JOB_SEND) return;

    const { userId, type, title, message, data } = job.data;

    await this.prisma.notification.create({
      data: { userId, type, title, message, data: data as any },
    });

    this.logger.debug(`Notification delivered to user ${userId}: ${title}`);
  }
}
