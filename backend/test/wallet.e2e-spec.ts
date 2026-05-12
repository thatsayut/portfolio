import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Wallet (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const ts = Date.now();
  const testUser = {
    email: `e2e_wallet_${ts}@test.com`,
    username: `e2e_wallet_${ts}`,
    password: 'testpass123',
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // Register to auto-create wallet, then login
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    accessToken = registerRes.body.data.accessToken;
    userId = registerRes.body.data.user.id;

    // Do a check-in so there's at least one transaction
    await request(app.getHttpServer())
      .post('/api/v1/reward/checkin')
      .set('Authorization', `Bearer ${accessToken}`);
  });

  afterAll(async () => {
    await prisma.checkinHistory.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  // ─── Wallet ──────────────────────────────────────────────────────────────────

  describe('GET /api/v1/wallet', () => {
    it('should return wallet with balance', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        balance: expect.any(String), // Decimal → string
        totalEarned: expect.any(String),
        totalSpent: expect.any(String),
      });

      // After check-in the balance should be > 0
      expect(parseFloat(res.body.data.balance)).toBeGreaterThan(0);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .expect(401);
    });
  });

  // ─── Transactions ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/wallet/transactions', () => {
    it('should return paginated transaction list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions')
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

      // Should have at least 1 transaction (the check-in reward)
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);

      const tx = res.body.data.data[0];
      expect(tx).toMatchObject({
        type: expect.any(String),
        amount: expect.any(String),
        balanceAfter: expect.any(String),
        createdAt: expect.any(String),
      });
    });

    it('should use default pagination when no query params', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.meta).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
      });
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/wallet/transactions')
        .expect(401);
    });
  });
});
