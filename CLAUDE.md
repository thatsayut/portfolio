# Reward Platform — CLAUDE.md

## Project Overview

Full-stack enterprise reward/check-in platform. Monorepo with two apps:

- `backend/` — NestJS 10 API (port 4000)
- `frontend/` — Next.js 15 App Router (port 3000)

## Architecture

```
frontend/ (Next.js 15)  →  backend/ (NestJS 10)  →  PostgreSQL + Redis
```

Auth flow: JWT access token (15m) + refresh token rotation (7d), stored in Zustand + localStorage.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | NestJS 10, TypeScript, Prisma ORM, PostgreSQL 16, Redis 7, BullMQ |
| Frontend | Next.js 15 App Router, TanStack Query v5, Zustand, RHF + Zod, Recharts |
| Styling | TailwindCSS + SCSS (sass) — BEM component classes + Tailwind utilities |
| Infra | Docker Compose, Nginx, GitHub Actions |

## Development Commands

### Start infrastructure (DB + Redis)
```bash
docker compose -f docker-compose.dev.yml up -d
```

### Backend
```bash
cd backend
npm install
cp .env.example .env          # then fill in secrets
npx prisma migrate dev
npx prisma db seed
npm run start:dev             # http://localhost:4000
# Swagger: http://localhost:4000/api/docs
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

### Useful backend scripts
```bash
npm run prisma:studio         # Prisma Studio GUI
npm run test                  # Unit tests
npm run test:e2e              # E2E tests
npm run lint                  # ESLint
npm run type-check            # tsc --noEmit
```

## Key Files

| File | Purpose |
|---|---|
| `backend/prisma/schema.prisma` | Complete DB schema — source of truth |
| `backend/src/app.module.ts` | Root module — all imports wired here |
| `backend/src/modules/wallet/wallet.repository.ts` | Transaction-safe wallet (idempotency + row lock) |
| `backend/src/modules/reward/checkin.service.ts` | Streak engine + cron reset |
| `backend/src/modules/bonus/bonus.processor.ts` | BullMQ worker for campaign distribution |
| `frontend/src/services/api.client.ts` | Axios client with auto refresh rotation |
| `frontend/src/stores/auth.store.ts` | Zustand auth store (persisted) |
| `frontend/src/styles/_variables.scss` | SCSS tokens + CSS custom properties |
| `frontend/src/styles/_mixins.scss` | Reusable mixins (breakpoints, btn, card, etc.) |
| `frontend/src/styles/_components.scss` | BEM component classes |
| `frontend/src/styles/globals.scss` | Entry point — imports Tailwind + all partials |
| `docs/decision.md` | Architecture Decision Records (ADRs) |

## Module Map

```
backend/src/modules/
├── auth/          JWT auth, refresh rotation, RBAC guards, Passport strategies
├── users/         Profile, avatar, repository pattern
├── wallet/        Transaction-safe balance, idempotency, row-level locking
├── reward/        Daily check-in, streak logic, configurable reward rules, cron
├── bonus/         Campaign CRUD, BullMQ batched distribution
├── admin/         Analytics, user management, config updates
├── notification/  EventEmitter2 listeners → BullMQ → DB
└── audit-log/     Immutable event-sourced audit trail
```

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://rpuser:rppassword@localhost:5432/reward_platform_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Default Seed Credentials

```
Admin:  admin@rewardplatform.com  /  Admin@123456  (SUPER_ADMIN)
User:   alice@example.com         /  User@123456   (USER)
```

## Coding Conventions

- **Commits**: conventional commits — `feat(module):`, `fix(module):`, `refactor(module):`, `docs:`
- **DTOs**: class-validator decorators + `@ApiProperty` for Swagger on every DTO
- **Guards**: `@Public()` to bypass JWT, `@Roles(UserRole.ADMIN)` for RBAC
- **Wallet mutations**: always go through `WalletRepository.creditWallet()` — never update balance directly
- **Events**: cross-module side effects use `EventEmitter2` — never import services across modules directly
- **Pagination**: use `paginate()` from `common/types/pagination.types.ts`

## Common Gotchas

- Wallet balance uses `Decimal` (Prisma) — always cast with `Number()` on the frontend
- Check-in date stored as `@db.Date` (no time component) — compare with `setHours(0,0,0,0)`
- BullMQ requires Redis to be running before the API starts
- `@Global()` modules: `DatabaseModule` (PrismaService available everywhere without import)
- Refresh token rotation: using a revoked token triggers full session wipe for that user
