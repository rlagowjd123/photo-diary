import { toDayKey, addDays, isFuture, oneYearAgo, monthGrid, dayHeading, coverHeading, formatTime } from '../../src/core/date';

test('toDayKey uses local time, not UTC', () => {
  expect(toDayKey(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
  expect(toDayKey(new Date(2026, 9, 8, 0, 1))).toBe('2026-10-08');
});
test('addDays crosses month and year', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});
test('isFuture', () => {
  expect(isFuture('2026-10-24', '2026-10-23')).toBe(true);
  expect(isFuture('2026-10-23', '2026-10-23')).toBe(false);
});
test('oneYearAgo handles leap day', () => {
  expect(oneYearAgo('2026-10-07')).toBe('2025-10-07');
  expect(oneYearAgo('2028-02-29')).toBe('2027-02-28');
});
test('monthGrid: Oct 2026 starts Thursday', () => {
  const g = monthGrid(2026, 9);
  expect(g.slice(0, 4)).toEqual([null, null, null, null]);
  expect(g[4]).toBe('2026-10-01');
  expect(g.filter(Boolean)).toHaveLength(31);
});
test('headings and time', () => {
  expect(dayHeading('2026-10-07')).toEqual({ label: 'WED · 2026', title: '10월 7일' });
  expect(coverHeading(new Date(2026, 9, 22))).toEqual({ num: '22', label: 'OCTOBER · THURSDAY' });
  expect(formatTime(new Date(2026, 9, 7, 9, 5).getTime())).toBe('09:05');
});
