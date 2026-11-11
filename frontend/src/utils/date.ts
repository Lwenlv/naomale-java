/**
 * 日期工具（统一使用本地时区）
 *
 * 原版使用 `new Date().toISOString().split('T')[0]` 取“今天”，
 * 在 UTC+8 的凌晨 0:00–8:00 会返回前一天，账本与历史记录会串日期。
 * 这里统一改用本地日期字符串。
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD，按本地时区 */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYYMMDD-HHmmss，用于备份文件名 */
export function fileStamp(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/** 将日期字符串平移若干天（按 UTC 中午计算，避开夏令时/时区漂移） */
export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
  base.setUTCDate(base.getUTCDate() + delta);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

/** 两个 YYYY-MM-DD 之间的整天数差（后者 - 前者） */
export function daysBetween(fromDate: string, toDate: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, (m || 1) - 1, d || 1);
  };
  return Math.round((parse(toDate) - parse(fromDate)) / 86_400_000);
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** 友好时间显示：2026-11-10 14:03 */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${localDateString(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return WEEKDAY_NAMES[dt.getDay()] ?? '';
}
