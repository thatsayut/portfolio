# Reward Platform API

Enterprise-grade reward and daily check-in platform built with NestJS 10.

## Tech Stack

- **NestJS 10** + TypeScript
- **Prisma ORM** + PostgreSQL 16
- **Redis 7** + BullMQ (job queue)
- **Passport JWT** (access + refresh token rotation)
- **Swagger** auto-generated docs

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL 16
- Redis 7
- Docker (optional, for infrastructure)

### Start Infrastructure (DB + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Install & Setup

```bash
npm install
cp .env.example .env       # then fill in secrets
npx prisma migrate dev
npx prisma db seed
```

### Run Development Server

```bash
npm run start:dev           # http://localhost:4000
```

- Swagger docs: http://localhost:4000/api/docs

### Default Credentials

| Role        | Email                        | Password       |
|-------------|------------------------------|----------------|
| Super Admin | admin@rewardplatform.com     | Admin@123456   |
| User        | alice@example.com            | User@123456    |

## Testing

### Unit Tests

Unit tests use **mocks** (no DB/Redis required) and run instantly.

```bash
npm run test                # run all unit tests (48 tests)
npm run test:watch          # watch mode
npm run test:cov            # with coverage report
```

**What's covered (unit):**

| Test File                    | Cases | Description                                       |
|------------------------------|-------|---------------------------------------------------|
| `auth.service.spec.ts`       | 16    | Register, login, refresh, logout, change/forgot password |
| `checkin.service.spec.ts`    | 13    | Streak logic, reward calculation, multipliers, status |
| `wallet.service.spec.ts`     | 6     | Credit, debit, get wallet, transactions            |
| `users.service.spec.ts`      | 8     | Profile, avatar, find users, search/filter         |
| `hash.util.spec.ts`          | 5     | bcrypt hash + compare                              |

### E2E Tests

E2E tests boot the full NestJS app and hit real API endpoints. **Requires DB + Redis running.**

```bash
docker compose -f docker-compose.dev.yml up -d   # start infra first
```

```bash
npm run test:e2e
```

**What's covered:**

| Test File             | Cases | Description                                       |
|-----------------------|-------|---------------------------------------------------|
| `auth.e2e-spec.ts`   | 9     | Register, login, refresh token, logout, protected routes |
| `reward.e2e-spec.ts` | 7     | Check-in status, perform check-in, double check-in guard, history |
| `wallet.e2e-spec.ts` | 5     | Wallet balance, transaction list, pagination       |

**Notes:**
- Each test suite creates a unique user (timestamped) and cleans up after itself
- Tests are ordered sequentially within each suite (e.g., register before login)
- The check-in test requires `CheckinConfig` to be seeded in the database (`npx prisma db seed`)

### Run a Single Test File

```bash
npx jest --config ./test/jest-e2e.json --testPathPattern auth
npx jest --config ./test/jest-e2e.json --testPathPattern reward
npx jest --config ./test/jest-e2e.json --testPathPattern wallet
```

## Project Structure

```
src/
├── common/             # Guards, decorators, filters, interceptors, utils
├── config/             # App & JWT config
├── database/           # Prisma service (global)
└── modules/
    ├── auth/           # JWT auth, refresh rotation, RBAC
    ├── users/          # Profile, avatar
    ├── wallet/         # Transaction-safe balance, idempotency
    ├── reward/         # Daily check-in, streak logic, cron
    ├── bonus/          # Campaign CRUD, BullMQ batch distribution
    ├── admin/          # Analytics, user management
    ├── notification/   # EventEmitter2 -> BullMQ -> DB
    └── audit-log/      # Immutable event-sourced audit trail

test/
├── helpers/
│   └── create-app.ts   # Shared test app bootstrap
├── auth.e2e-spec.ts
├── reward.e2e-spec.ts
├── wallet.e2e-spec.ts
└── jest-e2e.json       # E2E Jest config
```

## Useful Scripts

```bash
npm run prisma:studio     # Prisma Studio GUI
npm run lint              # ESLint
npm run type-check        # tsc --noEmit
npm run build             # Production build
npm run start:prod        # Run production build
```

## Environment Variables

See `.env.example` for all available variables.

| Variable              | Description                    | Default                  |
|-----------------------|--------------------------------|--------------------------|
| `DATABASE_URL`        | PostgreSQL connection string   | -                        |
| `REDIS_URL`           | Redis connection string        | `redis://localhost:6379` |
| `JWT_SECRET`          | Access token signing key       | -                        |
| `JWT_REFRESH_SECRET`  | Refresh token signing key      | -                        |
| `JWT_EXPIRES_IN`      | Access token TTL               | `15m`                    |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL           | `7d`                     |
| `PORT`                | API port                       | `4000`                   |
