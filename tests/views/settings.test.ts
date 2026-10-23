import { emptyMeta, markBackedUp } from '../../src/core/diary';
import { settingsInfo } from '../../src/views/settings';

test('years with records, newest first; last backup text', () => {
  const info = settingsInfo(['2025-03-01', '2026-10-07', '2026-01-02'], emptyMeta());
  expect(info.years).toEqual([2026, 2025]);
  expect(info.lastBackup).toBe('아직 없어요');
  const m = markBackedUp(markBackedUp(emptyMeta(), 2025, new Date(2026, 0, 5).getTime()), 2026, new Date(2026, 9, 20).getTime());
  expect(settingsInfo([], m).lastBackup).toBe('2026년 10월 20일');
  expect(settingsInfo([], m).years).toEqual([]);
});
