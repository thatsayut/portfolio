import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { paginate, getPrismaSkip } from '../../common/types/pagination.types';

export interface AuditLogEntry {
  userId?: string;
  adminId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({ data: entry as any });
  }

  async findAll(params: { page: number; limit: number; action?: string; entity?: string }) {
    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.entity) where.entity = params.entity;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: getPrismaSkip(params.page, params.limit),
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          admin: { select: { id: true, username: true, email: true } },
        },
      }),
    ]);

    return paginate(data, total, params.page, params.limit);
  }

  // ─── Event-driven audit listeners ───────────────────────────────────────────

  @OnEvent('user.loggedIn')
  async onLogin(payload: { userId: string; ipAddress?: string }) {
    await this.log({
      userId: payload.userId,
      action: AuditAction.LOGIN,
      entity: 'users',
      entityId: payload.userId,
      ipAddress: payload.ipAddress,
    });
  }

  @OnEvent('admin.userStatusChanged')
  async onUserStatusChanged(payload: { adminId: string; userId: string; status: string }) {
    await this.log({
      adminId: payload.adminId,
      userId: payload.userId,
      action: AuditAction.UPDATE,
      entity: 'users',
      entityId: payload.userId,
      newValue: { status: payload.status },
    });
  }

  @OnEvent('admin.userRoleChanged')
  async onUserRoleChanged(payload: { adminId: string; userId: string; role: string }) {
    await this.log({
      adminId: payload.adminId,
      userId: payload.userId,
      action: AuditAction.UPDATE,
      entity: 'users',
      entityId: payload.userId,
      newValue: { role: payload.role },
    });
  }

  @OnEvent('admin.configUpdated')
  async onConfigUpdated(payload: { adminId: string; configId: string }) {
    await this.log({
      adminId: payload.adminId,
      action: AuditAction.UPDATE_CONFIG,
      entity: 'checkin_configs',
      entityId: payload.configId,
    });
  }
}
