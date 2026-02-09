import { Transaction } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const POINT_EXPIRY_DAYS = 500;

export type PointEntry = {
  id: string;
  earnedAt: Date;
  expiresAt: Date;
  customerName?: string;
  customerId?: string | null;
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDaysRemaining = (expiresAt: Date, now = new Date()) =>
  Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY);

export const buildPointEntries = (transactions: Transaction[]): PointEntry[] =>
  transactions
    .filter((transaction) => transaction.status === 'DONE')
    .map((transaction) => {
      const earnedAt = new Date(transaction.created_at);
      return {
        id: transaction.id,
        earnedAt,
        expiresAt: addDays(earnedAt, POINT_EXPIRY_DAYS),
        customerName: transaction.customer?.name ?? 'Umum',
        customerId: transaction.customer?.id ?? null,
      };
    })
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

export const getActivePointEntries = (transactions: Transaction[], now = new Date()) =>
  buildPointEntries(transactions).filter((entry) => entry.expiresAt.getTime() >= now.getTime());

export const calculatePointSummary = (transactions: Transaction[], now = new Date()) => {
  const activeEntries = getActivePointEntries(transactions, now);
  const nextExpiryDate = activeEntries[0]?.expiresAt ?? null;
  const nextExpiryCount = nextExpiryDate
    ? activeEntries.filter((entry) => isSameDay(entry.expiresAt, nextExpiryDate)).length
    : 0;
  const daysRemaining = nextExpiryDate ? getDaysRemaining(nextExpiryDate, now) : null;
  const progressPercent = daysRemaining
    ? Math.min(
        100,
        Math.max(0, ((POINT_EXPIRY_DAYS - daysRemaining) / POINT_EXPIRY_DAYS) * 100)
      )
    : 0;

  return {
    activeEntries,
    nextExpiryDate,
    nextExpiryCount,
    daysRemaining,
    progressPercent,
  };
};
