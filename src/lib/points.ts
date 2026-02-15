import { PointEntry as ApiPointEntry } from '../types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const POINT_EXPIRY_DAYS = 365;

export type PointLedgerEntry = {
  id: string;
  earnedAt: Date;
  expiresAt: Date;
  points: number;
  customerName?: string;
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

export const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDaysRemaining = (expiresAt: Date, now = new Date()) =>
  Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY);

const getMonthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export const buildPointEntries = (entries: ApiPointEntry[]): PointLedgerEntry[] =>
  entries
    .map((entry) => ({
      id: entry.id,
      earnedAt: new Date(entry.earned_at),
      expiresAt: new Date(entry.expires_at),
      points: entry.points,
      customerName: entry.customer?.name ?? 'Customer',
    }))
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

export const getActivePointEntries = (entries: ApiPointEntry[], now = new Date()) =>
  buildPointEntries(entries).filter((entry) => entry.expiresAt.getTime() >= now.getTime());

export const calculatePointSummary = (entries: ApiPointEntry[], now = new Date()) => {
  const activeEntries = getActivePointEntries(entries, now);
  const totalPoints = activeEntries.reduce((sum, entry) => sum + entry.points, 0);
  const monthlyMap = activeEntries.reduce((acc, entry) => {
    const monthKey = getMonthKey(entry.expiresAt);
    const monthEnd = getMonthEnd(entry.expiresAt);
    const existing = acc.get(monthKey);
    if (existing) {
      acc.set(monthKey, { ...existing, count: existing.count + entry.points });
    } else {
      acc.set(monthKey, { monthEnd, count: entry.points });
    }
    return acc;
  }, new Map<string, { monthEnd: Date; count: number }>());

  const sortedMonthly = Array.from(monthlyMap.values()).sort(
    (left, right) => left.monthEnd.getTime() - right.monthEnd.getTime()
  );
  const nextExpiry = sortedMonthly[0];
  const daysRemaining = nextExpiry ? getDaysRemaining(nextExpiry.monthEnd, now) : null;
  const progressPercent = totalPoints
    ? Math.min(100, Math.max(0, (totalPoints / 20) * 100))
    : 0;

  return {
    activeEntries,
    totalPoints,
    nextExpiryDate: nextExpiry?.monthEnd ?? null,
    nextExpiryCount: nextExpiry?.count ?? 0,
    daysRemaining,
    progressPercent,
  };
};
