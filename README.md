# Reward Platform

A full-stack **daily check-in and reward system** — the kind of loyalty engine behind apps like Shopee Coins, Grab Rewards, or game login bonuses.

Users check in every day to build a streak. Longer streaks unlock higher rewards with bonus multipliers. Admins manage reward rules, run bonus campaigns, and monitor everything through a real-time dashboard.

Built as a portfolio project to demonstrate **production-grade backend engineering**: transaction-safe wallet operations, JWT refresh token rotation with reuse detection, event-driven architecture, and a comprehensive test suite.

---

## What It Does

### For Users
- **Daily Check-in** — one tap per day to earn coins
- **Streak System** — consecutive days multiply rewards (Day 7 = 2x, Day 30 = 3x)
- **Wallet** — real-time balance with full transaction history
- **Profile** — manage account, view stats, track streak progress

### For Admins
- **Dashboard** — check-in trends, active users, total rewards distributed
- **Reward Config** — customize base rewards, streak milestones, multipliers
- **Bonus Campaigns** — bulk distribute coins to users (processed via background jobs)
- **User Management** — search, suspend, ban users
- **Audit Logs** — immutable trail of every admin action

---

## Architecture

```
                          ┌─────────────────────────────────┐
                          │     Next.js 15 (Frontend)       │
                          │   TanStack Query + Zustand      │
                          │   Tailwind CSS + SCSS           │
                          └──────────────┬──────────────────┘
                                         │ REST API
                          ┌──────────────▼──────────────────┐
                          │     NestJS 10 (Backend API)     │
                          │   Modular architecture          │
                          │   JWT auth + RBAC guards        │
                          ├─────────────┬───────────────────┤
                          │             │                   │
                   ┌──────▼──────┐  ┌──▼─────────────┐     │
                   │ PostgreSQL  │  │     Redis       │     │
                   │   16        │  │     7           │     │
                   │             │  │                 │     │
                   │ - Users     │  │ - Cache layer   │     │
                   │ - Wallets   │  │ - BullMQ jobs   │     │
                   │ - Streaks   │  │ - Rate limiting │     │
                   │ - Audit     │  │                 │     │
                   └─────────────┘  └─────────────────┘     │
                          │                                 │
                          │  EventEmitter2 (cross-module)   │
                          │  BullMQ (async job processing)  │
                          └─────────────────────────────────┘
```

---

## Engineering Highlights

These are the parts worth walking through in a technical interview:

### 1. Transaction-Safe Wallet (3-Layer Protection)
> [`backend/src/modules/wallet/wallet.repository.ts`](backend/src/modules/wallet/wallet.repository.ts)

Every wallet mutation goes through three safety layers:
- **Idempotency key** — duplicate requests with the same `reference` are rejected before any write
- **Database transaction** — balance update + transaction record creation are atomic (`Prisma.$transaction`)
- **Row-level lock** — `SELECT ... FOR UPDATE` prevents concurrent reads of stale balances

This eliminates double-spend, race conditions, and phantom balances — the same approach used in real payment systems.

### 2. JWT Refresh Token Rotation with Reuse Detection
> [`backend/src/modules/auth/auth.service.ts`](backend/src/modules/auth/auth.service.ts)

- Access tokens expire in 15 minutes (short window if intercepted)
- Each refresh rotates: old token revoked, new token issued
- **If a revoked token is reused** (token theft scenario), all sessions for that user are immediately invalidated
- Refresh tokens are DB-backed, making logout truly revocable

### 3. Streak Calculation Engine
> [`backend/src/modules/reward/checkin.service.ts`](backend/src/modules/reward/checkin.service.ts)

- Consecutive daily check-ins build a streak (Day 1 → Day 30)
- Missing a day resets to Day 1
- Reward rules are admin-configurable: base amounts + multipliers per milestone day
- Fallback logic: if no exact rule matches Day 5, the system uses the closest lower rule (Day 3)
- Streak wraps around after max day (Day 30 → back to Day 1)

### 4. Event-Driven Module Communication
> [`backend/src/modules/`](backend/src/modules/) — modules never import each other's services

```
Check-in completed → EventEmitter2 → Notification module creates alert
User registered    → EventEmitter2 → Audit log records the event
Bonus campaign     → BullMQ queue  → Worker distributes coins in batches
```
This keeps modules independently testable and ready for microservice extraction.

### 5. Test Suite (48 unit + 21 E2E tests)

```bash
npm run test       # 48 unit tests — mock-based, no DB required (~10s)
npm run test:e2e   # 21 E2E tests — boots full app, hits real HTTP endpoints
```

Unit tests cover: auth flows, streak logic with edge cases, wallet credit/debit, user management, bcrypt hashing.
E2E tests cover: full register → login → refresh → logout flow, check-in lifecycle, wallet balance queries.

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Frontend    | Next.js 15, TypeScript, TanStack Query v5, Zustand     |
| Styling     | Tailwind CSS + SCSS (BEM component classes)             |
| Backend     | NestJS 10, TypeScript, Prisma ORM                       |
| Database    | PostgreSQL 16 (ACID, row-level locking)                 |
| Cache/Queue | Redis 7, BullMQ (durable job queue)                     |
| Auth        | Passport JWT, bcrypt, refresh token rotation            |
| Testing     | Jest (48 unit), Supertest (21 E2E)                      |
| Infra       | Docker Compose, Nginx                                   |

---

## Project Structure

```
reward-platform/
├── backend/                    # NestJS API (port 4000)
│   ├── src/
│   │   ├── common/             # Guards, decorators, filters, utils
│   │   └── modules/
│   │       ├── auth/           # JWT, refresh rotation, RBAC
│   │       ├── users/          # Profile, avatar, repository pattern
│   │       ├── wallet/         # Transaction-safe balance operations
│   │       ├── reward/         # Check-in, streak engine, reward rules
│   │       ├── bonus/          # Campaign CRUD, BullMQ batch distribution
│   │       ├── admin/          # Dashboard analytics, user management
│   │       ├── notification/   # Event-driven alerts
│   │       └── audit-log/      # Immutable event-sourced trail
│   ├── prisma/                 # Schema, migrations, seed
│   └── test/                   # E2E tests
│
├── frontend/                   # Next.js 15 App Router (port 3000)
│   └── src/
│       ├── app/(auth)/         # Login, register pages
│       ├── app/(app)/          # Dashboard, check-in, wallet, admin
│       ├── services/           # API client with auto token refresh
│       ├── stores/             # Zustand (auth state, persisted)
│       └── styles/             # SCSS variables + Tailwind
│
└── docs/
    └── decision.md             # Architecture Decision Records (ADRs)
```

---

## Architecture Decisions

Key technical decisions are documented as ADRs in [`docs/decision.md`](docs/decision.md):

| ADR | Decision | Why |
|-----|----------|-----|
| 001 | PostgreSQL over MongoDB | ACID transactions, row-level locking for wallet safety |
| 002 | Redis for cache + queue | Single dependency for caching and BullMQ job broker |
| 003 | BullMQ for async jobs | Durable queues with retry + backoff for notifications/campaigns |
| 004 | Modular NestJS | Bounded contexts, event-driven, microservice-extraction ready |
| 005 | JWT + refresh rotation | Short-lived access tokens + reuse detection for token theft |
| 006 | 3-layer wallet safety | Idempotency + DB transaction + row lock = no double-spend |

---

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker (for PostgreSQL + Redis)

### 1. Start Infrastructure
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env              # fill in secrets
npx prisma migrate dev
npx prisma db seed
npm run start:dev                  # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                        # http://localhost:3000
```

### 4. Try It
| Role        | Email                        | Password       |
|-------------|------------------------------|----------------|
| Super Admin | admin@rewardplatform.com     | Admin@123456   |
| User        | alice@example.com            | User@123456    |

- Swagger API docs: http://localhost:4000/api/docs

### 5. Run Tests
```bash
cd backend
npm run test                       # 48 unit tests (~10s, no DB needed)
npm run test:e2e                   # 21 E2E tests (requires DB + Redis)
```

---

## API Overview

Full documentation at `http://localhost:4000/api/docs` (Swagger).

```http
# Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Check-in
POST   /api/v1/reward/checkin
GET    /api/v1/reward/checkin/status
GET    /api/v1/reward/checkin/history

# Wallet
GET    /api/v1/wallet
GET    /api/v1/wallet/transactions

# Admin
GET    /api/v1/admin/analytics/overview
GET    /api/v1/admin/users
POST   /api/v1/admin/reward/config
POST   /api/v1/admin/bonus/campaigns
GET    /api/v1/admin/audit-logs
```

### Example — Check-in Response

```json
{
  "success": true,
  "data": {
    "streakDay": 7,
    "baseReward": 20,
    "bonusAmount": 20,
    "totalAmount": 40,
    "walletBalance": 350,
    "message": "Weekly Bonus unlocked! Day 7 complete."
  }
}
```

---

## Database Schema

```
Users ──────┬── Wallet ──── WalletTransactions
            ├── CheckinHistory ──── CheckinConfig ──── RewardRules
            ├── RefreshTokens
            ├── Notifications
            └── AuditLogs

BonusCampaigns (created by Admin, distributed via BullMQ workers)
```

Full schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

---

## License

MIT
