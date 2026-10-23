/** 'YYYY-MM-DD' in the device's local time. */
export type DayKey = string;

const WD_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MON_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseDayKey(k);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

export function isFuture(k: DayKey, today: DayKey): boolean {
  return k > today;
}

export function oneYearAgo(k: DayKey): DayKey {
  const [y, m, d] = k.split('-').map(Number);
  const lastDay = new Date(y - 1, m, 0).getDate();
  return toDayKey(new Date(y - 1, m - 1, Math.min(d, lastDay)));
}

export function monthGrid(year: number, month0: number): (DayKey | null)[] {
  const lead = new Date(year, month0, 1).getDay();
  const days = new Date(year, month0 + 1, 0).getDate();
  const cells: (DayKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toDayKey(new Date(year, month0, d)));
  return cells;
}

export function dayHeading(k: DayKey): { label: string; title: string } {
  const d = parseDayKey(k);
  return {
    label: `${WD_EN[d.getDay()].slice(0, 3)} · ${d.getFullYear()}`,
    title: `${d.getMonth() + 1}월 ${d.getDate()}일`,
  };
}

export function coverHeading(d: Date): { num: string; label: string } {
  return { num: String(d.getDate()), label: `${MON_EN[d.getMonth()]} · ${WD_EN[d.getDay()]}` };
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
