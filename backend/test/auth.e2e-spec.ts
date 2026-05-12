import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/create-app';
import { PrismaService } from '../src/database/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Unique test user per run to avoid conflicts
  const ts = Date.now();
  const testUser = {
    email: `e2e_${ts}@test.com`,
    username: `e2e_${ts}`,
    password: 'testpass123',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  // ─── Register ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        user: {
          email: testUser.email,
          username: testUser.username,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should reject duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/email already registered/i);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'nousername@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should login and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          email: testUser.email,
        },
      });

      // Save tokens for subsequent tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'anything' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate refresh token and return new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // Update tokens for subsequent tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ refreshToken: 'invalidtoken' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ─── Protected Route ─────────────────────────────────────────────────────────

  describe('Protected routes', () => {
    it('should reject request without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should allow request with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/wallet')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject the revoked refresh token after logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});
