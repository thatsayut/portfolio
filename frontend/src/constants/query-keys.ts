export const QUERY_KEYS = {
  // Auth
  ME: ['me'],

  // Wallet
  WALLET: ['wallet'],
  TRANSACTIONS: (page: number) => ['wallet', 'transactions', page],

  // Reward
  CHECKIN_STATUS: ['checkin', 'status'],
  CHECKIN_HISTORY: (page: number) => ['checkin', 'history', page],

  // Notifications
  NOTIFICATIONS: (page: number) => ['notifications', page],
  UNREAD_COUNT: ['notifications', 'unread'],

  // Admin
  ADMIN_OVERVIEW: ['admin', 'overview'],
  ADMIN_CHECKIN_ANALYTICS: (from?: string, to?: string) => ['admin', 'checkins', from, to],
  ADMIN_USERS: (page: number, search?: string) => ['admin', 'users', page, search],
  ADMIN_CAMPAIGNS: (page: number) => ['admin', 'campaigns', page],
  ADMIN_AUDIT_LOGS: (page: number) => ['admin', 'audit-logs', page],
  // Lucky Draw
  LUCKY_DRAW_CONFIG: ['lucky-draw', 'config'],
  LUCKY_DRAW_HISTORY: (page: number) => ['lucky-draw', 'history', page],
  LUCKY_DRAW_ADMIN_CONFIG: ['lucky-draw', 'admin', 'config'],
} as const;
