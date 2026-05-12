import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Reward / Check-in (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const ts = Date.now();
  const testUser = {
    email: `e2e_reward_${ts}@test.com`,
    username: `e2e_reward_${ts}`,
    password: 'testpass123',
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // Register + login to get a token
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    accessToken = registerRes.body.data.accessToken;
    userId = registerRes.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up: remove check-in records then the user
    await prisma.checkinHistory.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  // ─── Status ──────────────────────────────────────────────────────────────────

  describe('GET /api/v1/reward/checkin/status', () => {
    it('should return check-in status for a fresh user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reward/checkin/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        hasCheckedInToday: expect.any(Boolean),
        currentStreak: expect.any(Number),
      });
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reward/checkin/status')
        .expect(401);
    });
  });

  // ─── Check-in ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/reward/checkin', () => {
    it('should perform check-in and return reward info', async () => {
      // First ensure user hasn't checked in today (clean state from afterAll)
      const statusBefore = await request(app.getHttpServer())
        .get('/api/v1/reward/checkin/status')
        .set('Authorization', `Bearer ${accessToken}`);

      if (statusBefore.body.data.hasCheckedInToday) {
        // Skip check-in test if already checked in (ran multiple times today)
        console.warn('User already checked in today — skipping check-in test');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/v1/reward/checkin')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        message: expect.any(String),
        streakDay: expect.any(Number),
        baseReward: expect.any(Number),
        totalAmount: expect.any(Number),
        walletBalance: expect.any(Number),
      });
      expect(res.body.data.totalAmount).toBeGreaterThan(0);
    });

    it('should reject double check-in on same day', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reward/checkin')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already checked in/i);
    });

    it('should reject unauthenticated check-in', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reward/checkin')
        .expect(401);
    });
  });

  // ─── Status after check-in ───────────────────────────────────────────────────

  describe('GET /api/v1/reward/checkin/status (after check-in)', () => {
    it('should show hasCheckedInToday = true after check-in', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reward/checkin/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hasCheckedInToday).toBe(true);
      expect(res.body.data.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── History ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/reward/checkin/history', () => {
    it('should return paginated check-in history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reward/checkin/history')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        data: expect.any(Array),
        meta: {
          page: 1,
          limit: 10,
          total: expect.any(Number),
        },
      });

      // After check-in, should have at least 1 record
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);

      const first = res.body.data.data[0];
      expect(first).toMatchObject({
        streakDay: expect.any(Number),
        totalAmount: expect.any(String), // Decimal serialized as string
        checkinDate: expect.any(String),
      });
    });

    it('should reject unauthenticated history request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reward/checkin/history')
        .expect(401);
    });
  });
});
