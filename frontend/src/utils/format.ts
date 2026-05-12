import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date: string | Date, fmt = 'MMM d, yyyy') =>
  format(new Date(date), fmt);

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), 'MMM d, yyyy HH:mm');

export const formatRelative = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatCoins = (amount: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    amount,
  );

export const formatTransactionType = (type: string): string => {
  const labels: Record<string, string> = {
    CHECKIN_BONUS: 'Daily Check-in',
    ADMIN_BONUS: 'Admin Bonus',
    SYSTEM_REWARD: 'System Reward',
    PENALTY: 'Penalty',
    REFERRAL_BONUS: 'Referral',
    MILESTONE_BONUS: 'Milestone',
  };
  return labels[type] ?? type;
};
