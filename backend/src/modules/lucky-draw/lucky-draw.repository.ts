import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getPrismaSkip } from '../../common/types/pagination.types';

@Injectable()
export class LuckyDrawRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveConfig() {
    return this.prisma.luckyDrawConfig.findFirst({
      where: { isEnabled: true },
      include: {
        slots: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfigById(id: string) {
    return this.prisma.luckyDrawConfig.findUnique({
      where: { id },
      include: {
        slots: { orderBy: { position: 'asc' } },
      },
    });
  }

  async getTodaySpinCount(userId: string, today: Date): Promise<number> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.luckyDrawHistory.count({
      where: {
        userId,
        createdAt: { gte: today, lt: tomorrow },
      },
    });
  }

  async createSpinRecord(data: {
    userId: string;
    configId: string;
    slotId: string;
    rewardAmount: number;
  }) {
    return this.prisma.luckyDrawHistory.create({ data });
  }

  async getHistory(params: { userId: string; page: number; limit: number }) {
    const where = { userId: params.userId };
    const [total, data] = await Promise.all([
      this.prisma.luckyDrawHistory.count({ where }),
      this.prisma.luckyDrawHistory.findMany({
        where,
        include: { slot: { select: { label: true, color: true } } },
        skip: getPrismaSkip(params.page, params.limit),
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, total };
  }

  // ─── Admin ─────────────────────────────────────────────────────

  async upsertConfig(data: {
    name: string;
    isEnabled: boolean;
    costPerSpin: number;
    maxSpinsPerDay: number;
  }) {
    // Deactivate all existing, then create new
    await this.prisma.luckyDrawConfig.updateMany({ data: { isEnabled: false } });
    return this.prisma.luckyDrawConfig.create({
      data: { ...data, isEnabled: true },
      include: { slots: { orderBy: { position: 'asc' } } },
    });
  }

  async updateConfig(
    configId: string,
    data: { name?: string; isEnabled?: boolean; costPerSpin?: number; maxSpinsPerDay?: number },
  ) {
    return this.prisma.luckyDrawConfig.update({
      where: { id: configId },
      data,
      include: { slots: { orderBy: { position: 'asc' } } },
    });
  }

  async upsertSlot(
    configId: string,
    slot: {
      id?: string;
      label: string;
      rewardAmount: number;
      weight: number;
      color: string;
      position: number;
      isActive: boolean;
    },
  ) {
    if (slot.id) {
      return this.prisma.luckyDrawSlot.update({
        where: { id: slot.id },
        data: {
          label: slot.label,
          rewardAmount: slot.rewardAmount,
          weight: slot.weight,
          color: slot.color,
          position: slot.position,
          isActive: slot.isActive,
        },
      });
    }
    return this.prisma.luckyDrawSlot.create({
      data: { configId, ...slot },
    });
  }

  async deleteSlot(slotId: string) {
    return this.prisma.luckyDrawSlot.delete({ where: { id: slotId } });
  }

  async bulkUpsertSlots(
    configId: string,
    slots: Array<{
      id?: string;
      label: string;
      rewardAmount: number;
      weight: number;
      color: string;
      position: number;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.$transaction(
      slots.map((slot, idx) => {
        const data = {
          label: slot.label,
          rewardAmount: slot.rewardAmount,
          weight: slot.weight,
          color: slot.color,
          position: slot.position ?? idx,
          isActive: slot.isActive ?? true,
        };
        if (slot.id) {
          return this.prisma.luckyDrawSlot.update({ where: { id: slot.id }, data });
        }
        return this.prisma.luckyDrawSlot.create({ data: { configId, ...data } });
      }),
    );
  }
}
