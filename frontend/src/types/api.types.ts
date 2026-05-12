export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  error: { code: string; message: string | string[] };
  path: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type TransactionType = 'CHECKIN_BONUS' | 'ADMIN_BONUS' | 'SYSTEM_REWARD' | 'PENALTY' | 'REFERRAL_BONUS' | 'MILESTONE_BONUS';

export interface User {
  id: string;
  email: string;
  username: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description?: string;
  metadata?: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface CheckinStatus {
  hasCheckedInToday: boolean;
  currentStreak: number;
  todayCheckin?: CheckinHistory;
  nextReward?: { baseReward: number; bonusAmount: number; rule: RewardRule | null };
  nextCheckinAt: string;
  config: { isEnabled: boolean; rules: RewardRule[] };
}

export interface CheckinResult {
  streakDay: number;
  baseReward: number;
  bonusAmount: number;
  totalAmount: number;
  walletBalance: number;
  message: string;
  nextCheckinAt: string;
}

export interface CheckinHistory {
  id: string;
  userId: string;
  checkinDate: string;
  streakDay: number;
  baseReward: number;
  bonusAmount: number;
  totalAmount: number;
  createdAt: string;
}

export interface RewardRule {
  id: string;
  streakDay: number;
  rewardAmount: number;
  bonusMultiplier: number;
  label?: string;
}

export interface BonusCampaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  amount: number;
  multiplier: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  processedAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalCheckins: number;
  totalRewardsDistributed: number;
  rewardsLast30Days: number;
  newUsersLast30Days: number;
}

export interface CheckinAnalyticsPoint {
  date: string;
  count: number;
  totalReward: number;
}

// Lucky Draw
export interface LuckyDrawSlot {
  id: string;
  label: string;
  rewardAmount: number;
  color: string;
  position: number;
}

export interface LuckyDrawAdminSlot extends LuckyDrawSlot {
  weight: number;
  isActive: boolean;
}

export interface LuckyDrawWheelConfig {
  isEnabled: boolean;
  costPerSpin: number;
  maxSpinsPerDay: number;
  spinsRemaining: number;
  slots: LuckyDrawSlot[];
}

export interface LuckyDrawSpinResult {
  slot: LuckyDrawSlot;
  rewardAmount: number;
  walletBalance: number;
  spinsRemaining: number;
  message: string;
}

export interface LuckyDrawAdminConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  costPerSpin: number;
  maxSpinsPerDay: number;
  slots: LuckyDrawAdminSlot[];
}

export interface LuckyDrawHistory {
  id: string;
  rewardAmount: string;
  createdAt: string;
  slot: { label: string; color: string };
}
