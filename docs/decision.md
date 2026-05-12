# Architecture Decision Records

## ADR-001: PostgreSQL over MongoDB

**Status:** Accepted

### Context
The Reward Platform requires storing financial-grade wallet transactions, enforcing referential integrity between users/wallets/transactions, and running complex analytical queries for the admin dashboard.

### Decision
Use **PostgreSQL 16** as the primary datastore.

### Rationale
- **ACID transactions**: Wallet credits and streak updates must be atomic. PostgreSQL's serializable transaction isolation eliminates phantom reads and write skew. MongoDB's multi-document transactions are available but carry additional operational overhead.
- **Referential integrity**: Foreign key constraints on `wallet_transactions.walletId`, `checkin_histories.userId`, etc. are enforced at the database level — not just application level.
- **Rich query language**: Admin analytics (daily check-in trends, bonus distribution) require aggregations with window functions (`ROW_NUMBER`, `SUM OVER`). These are native to PostgreSQL and significantly simpler than MongoDB aggregation pipelines.
- **Row-level locking**: `SELECT ... FOR UPDATE` enables optimistic/pessimistic locking on wallet rows, which is critical for the race condition prevention strategy.
- **Schema stability**: Reward rules, streak configs, and bonus campaigns have well-defined, stable schemas. Document flexibility is unnecessary here and would undermine type safety.

### Trade-offs
- Less flexible for storing unstructured `metadata` fields → mitigated by using `JSONB` columns where flexibility is needed (e.g., `wallet_transactions.metadata`).

---

## ADR-002: Redis for Caching and Queue Broker

**Status:** Accepted

### Context
The system needs both a cache layer (reduce DB reads for hot paths) and a durable job queue (notifications, bonus distribution).

### Decision
Use **Redis 7** as the unified solution for caching (via `cache-manager-redis-store`) and job queuing (via **BullMQ**).

### Rationale
- **Single infrastructure dependency**: One Redis instance handles both concerns in development and can be split into separate instances in production.
- **BullMQ maturity**: BullMQ offers durable queues, retries, rate limiting, and delayed jobs — all necessary for the notification and bonus distribution pipelines.
- **TTL-based eviction**: Config reads (check-in rules, reward rules) are cached with a 5-minute TTL. Leaderboard data uses a 1-minute TTL. This reduces primary DB load by ~60% on read-heavy paths.
- **Atomic operations**: Redis `SETNX` enables distributed locking for the idempotency check layer in wallet operations.

### Trade-offs
- Redis is in-memory; data is lost on restart without persistence enabled → mitigated by enabling AOF persistence in production config.

---

## ADR-003: BullMQ for Asynchronous Job Processing

**Status:** Accepted

### Context
Several operations (sending notifications, distributing bonus campaigns to thousands of users) must not block the HTTP request cycle and need reliable retry semantics.

### Decision
Use **BullMQ** for all asynchronous job processing.

### Rationale
- **Durability**: Jobs are persisted in Redis. If a worker crashes mid-processing, the job re-enters the queue.
- **Retry with backoff**: Failed notification deliveries automatically retry with exponential backoff — configurable per queue.
- **Delayed jobs**: Bonus campaigns with a `startDate` in the future are added to BullMQ as delayed jobs, removing the need for polling.
- **Concurrency control**: Workers can process jobs concurrently with a configurable `concurrency` setting, enabling horizontal scaling of the notification pipeline without DB contention.

### Trade-offs
- Adds Redis as a required dependency → acceptable since Redis is already used for caching.
- At-least-once delivery requires idempotent consumers → all processors implement idempotency checks.

---

## ADR-004: Modular NestJS Architecture

**Status:** Accepted

### Context
The system has clearly bounded subdomains: auth, wallet, rewards, bonuses, notifications. These need to evolve independently without cross-module coupling.

### Decision
Structure the backend as a **modular NestJS application** with one module per domain, communicating via EventEmitter2 events and explicit service injection.

### Rationale
- **Single Responsibility**: Each module (Auth, Wallet, Reward, etc.) owns its own controllers, services, repositories, and DTOs. Changes to wallet logic cannot accidentally break check-in logic.
- **Testability**: Modules can be tested in isolation with mocked dependencies.
- **Extraction path**: If the system needs to scale to microservices, each module is already a coherent bounded context that can be extracted with minimal refactoring.
- **EventEmitter2**: Cross-cutting concerns (reward credited → emit event → notification handler) are handled via events, preventing direct service coupling between modules.

### Trade-offs
- Slightly more boilerplate than a flat structure → acceptable for a system of this complexity.
- Event-driven communication is harder to trace than direct calls → mitigated by structured logging in all event handlers.

---

## ADR-005: JWT with Refresh Token Rotation

**Status:** Accepted

### Context
The platform needs stateless, scalable authentication that supports logout and token revocation.

### Decision
Use **short-lived JWT access tokens (15 minutes)** combined with **rotating refresh tokens (7 days)** stored in an HttpOnly cookie.

### Rationale
- **Short access token TTL**: Limits the window of exposure if a token is intercepted.
- **Refresh token rotation**: Every use of a refresh token generates a new refresh token and invalidates the previous one. This provides a form of active session management without requiring server-side access token validation.
- **DB-backed refresh tokens**: Refresh tokens are stored in the `refresh_tokens` table. Logout invalidates the stored token, making the session truly revocable.
- **Reuse detection**: If a refresh token is used twice (token theft scenario), the system detects the collision and invalidates all sessions for that user.

### Trade-offs
- Requires a DB read on every token refresh → acceptable; refresh cycles are infrequent (every 15 minutes at most).

---

## ADR-006: Transaction Safety Strategy for Wallet

**Status:** Accepted

### Context
The wallet must handle concurrent check-in requests, admin bonuses, and penalty operations without producing inconsistent balances.

### Decision
Implement a three-layer safety strategy:

1. **Idempotency keys** (application layer): Each wallet mutation carries a unique `reference` string. Before writing, the service queries for an existing transaction with that reference.
2. **Database transactions** (Prisma `$transaction`): Wallet balance update and transaction record creation are wrapped in a single atomic DB transaction.
3. **Row-level locking** (`SELECT ... FOR UPDATE`): The wallet row is locked for the duration of the transaction, preventing concurrent mutations from reading stale balances.

### Rationale
- Layer 1 handles network retries (client re-sends same request).
- Layer 2 handles application-level failures (process crash between balance update and transaction record creation).
- Layer 3 handles concurrent requests arriving simultaneously at the DB level.

No single layer is sufficient alone; all three are necessary for financial-grade reliability.

### Trade-offs
- `SELECT ... FOR UPDATE` reduces write throughput under very high concurrency → acceptable at current scale; can be replaced with optimistic locking + retry for higher throughput at the cost of implementation complexity.
