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

test('restore warning names what will be lost', async () => {
  const { restoreWarning } = await import('../../src/views/settings');
  const msg = restoreWarning(2026, ['2026-03-01', '2026-03-02'], ['2026-03-01', '2026-04-10', '2026-10-07', '2025-01-01']);
  expect(msg).toBe('지금 폰에 있는 2026년 기록(3일)을 지우고 백업 파일의 기록(2일)으로 바꿔요. 백업에 없는 2일은 사라지고 되돌릴 수 없어요.');
  expect(restoreWarning(2026, ['2026-03-01'], ['2026-03-01'])).toBe('지금 폰에 있는 2026년 기록(1일)을 지우고 백업 파일의 기록(1일)으로 바꿔요. 되돌릴 수 없어요.');
});
