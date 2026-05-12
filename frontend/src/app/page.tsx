import Link from 'next/link';

const features = [
  {
    icon: '🔥',
    title: 'Daily Streak',
    desc: 'Check in every day to build your streak. Miss a day? It resets. Keep it alive to unlock bigger rewards.',
  },
  {
    icon: '💎',
    title: 'Multiplier Rewards',
    desc: 'Hit milestones at Day 7, 14, and 30 to unlock 2x and 3x bonus multipliers on your daily reward.',
  },
  {
    icon: '🎰',
    title: 'Lucky Draw',
    desc: 'Spin the wheel for a chance to win up to 500 coins! Weighted probability system with admin-configurable slots.',
  },
  {
    icon: '💰',
    title: 'Wallet System',
    desc: 'Every coin earned is tracked with a full transaction history. No phantom balances — bank-grade transaction safety.',
  },
  {
    icon: '🎯',
    title: 'Bonus Campaigns',
    desc: 'Admins can launch time-limited campaigns to distribute bonus coins to all users in bulk.',
  },
  {
    icon: '📊',
    title: 'Admin Dashboard',
    desc: 'Real-time analytics: check-in trends, active users, reward distribution, and full audit trail.',
  },
  {
    icon: '🛡️',
    title: 'Role-Based Access',
    desc: 'Users earn rewards. Admins configure everything — reward rules, Lucky Draw slots, campaigns, and user management.',
  },
  {
    icon: '🔒',
    title: 'Secure Auth',
    desc: 'JWT with 15-minute access tokens, rotating refresh tokens, and automatic reuse detection for token theft.',
  },
  {
    icon: '📋',
    title: 'Audit Trail',
    desc: 'Every admin action is logged immutably. Full event-sourced audit system for compliance and accountability.',
  },
];

const steps = [
  { num: '1', title: 'Sign Up', desc: 'Create your account in seconds', icon: '👤' },
  { num: '2', title: 'Check In Daily', desc: 'One tap per day to earn coins', icon: '✅' },
  { num: '3', title: 'Build Your Streak', desc: 'Consecutive days = bigger rewards', icon: '🔥' },
  { num: '4', title: 'Earn Rewards', desc: 'Hit milestones for bonus multipliers', icon: '🎁' },
];

const techStack = [
  { label: 'Frontend', items: 'Next.js 15, TypeScript, TanStack Query, Zustand, Tailwind CSS' },
  { label: 'Backend', items: 'NestJS 10, TypeScript, Prisma ORM, Passport JWT' },
  { label: 'Database', items: 'PostgreSQL 16 (ACID, row-level locking)' },
  { label: 'Cache & Queue', items: 'Redis 7, BullMQ (durable job queue)' },
  { label: 'Testing', items: '48 unit tests + 21 E2E tests (Jest, Supertest)' },
  { label: 'Infra', items: 'Docker Compose, Nginx, GitHub Actions CI' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─────────────────────────────────────────────────── */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <span className="font-bold text-lg">Reward Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Full-Stack Portfolio Project
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Check In Daily.
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
              Earn Rewards.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A loyalty &amp; reward system like Shopee Coins or Grab Rewards.
            Build streaks, unlock multipliers, and earn coins every day.
            <br />
            <span className="text-sm opacity-75">
              Built with NestJS + Next.js to demonstrate production-grade backend engineering.
            </span>
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
            >
              Start Earning
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-border rounded-xl font-semibold text-lg text-foreground hover:bg-accent transition"
            >
              Sign In
            </Link>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-xs text-muted-foreground">
            <span>Demo:</span>
            <code className="font-mono text-foreground">alice@example.com</code>
            <span>/</span>
            <code className="font-mono text-foreground">User@123456</code>
          </div>
        </div>
      </section>

      {/* ─── Streak Preview ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">How the Streak Works</h2>
            <p className="text-muted-foreground">Consistency is rewarded. Here&apos;s a 30-day streak preview.</p>
          </div>

          <div className="grid grid-cols-10 gap-1.5 sm:gap-2 mb-6">
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const isMilestone = [7, 14, 30].includes(day);
              const isActive = day <= 12; // visual demo: 12 days completed
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                    isMilestone && isActive
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white ring-2 ring-yellow-500/50'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : isMilestone
                          ? 'bg-muted border-2 border-dashed border-yellow-500/40 text-yellow-500'
                          : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              Completed
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-yellow-500 to-orange-500" />
              Milestone (2x-3x bonus)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted border border-border" />
              Upcoming
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-muted-foreground">Four simple steps to start earning</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="relative text-center group">
              <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold sm:left-1/2 sm:translate-x-4 sm:right-auto">
                {step.num}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────── */}
      <section className="bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Platform Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just a toy project. Every feature demonstrates real-world patterns used in production systems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition group"
              >
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack (for interviewers) ─────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Built With</h2>
          <p className="text-muted-foreground">
            Production-grade stack. Not a tutorial copy-paste.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((t) => (
            <div key={t.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                {t.label}
              </p>
              <p className="text-sm text-muted-foreground">{t.items}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href="https://github.com/yourusername/reward-platform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View Source on GitHub
          </a>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Try It Now</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Create an account or use the demo credentials below to explore the full platform.
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <Link
              href="/register"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/25"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-border rounded-xl font-semibold text-foreground hover:bg-accent transition"
            >
              Sign In
            </Link>
          </div>

          <div className="inline-flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <span className="text-xs text-primary font-semibold uppercase tracking-wider">User</span>
              <div className="font-mono text-foreground mt-1">alice@example.com / User@123456</div>
            </div>
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <span className="text-xs text-primary font-semibold uppercase tracking-wider">Admin</span>
              <div className="font-mono text-foreground mt-1">admin@rewardplatform.com / Admin@123456</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>🎁</span>
            <span>Reward Platform — Portfolio Project</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/yourusername/reward-platform" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
              GitHub
            </a>
            <Link href="/login" className="hover:text-foreground transition">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
