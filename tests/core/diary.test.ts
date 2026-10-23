import {
  effectiveCoverId, appendPhotoIds, removePhotoId, movePhotoId, setCoverId,
  clampComment, commentLineCount, countRecordedDays,
  emptyMeta, markChanged, markBackedUp, needsBackupNudge,
} from '../../src/core/diary';

const day = (ids: string[], coverId: string | null = null) => ({ key: '2026-10-07', photoIds: ids, coverId });

test('cover defaults to first, follows explicit choice', () => {
  expect(effectiveCoverId(day(['a', 'b']))).toBe('a');
  expect(effectiveCoverId(day(['a', 'b'], 'b'))).toBe('b');
  expect(effectiveCoverId(day(['a', 'b'], 'zz'))).toBe('a');
  expect(effectiveCoverId(day([]))).toBeNull();
});
test('setCoverId', () => {
  expect(setCoverId(day(['a', 'b']), 'b').coverId).toBe('b');
});
test('append respects 5 per day', () => {
  const r = appendPhotoIds(day(['a', 'b', 'c']), '2026-10-07', ['d', 'e', 'f', 'g']);
  expect(r.day.photoIds).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(r.accepted).toEqual(['d', 'e']);
  expect(r.rejected).toBe(2);
  expect(appendPhotoIds(undefined, '2026-10-08', ['x']).day).toEqual({ key: '2026-10-08', photoIds: ['x'], coverId: null });
});
test('append does not mutate input', () => {
  const d = day(['a']);
  appendPhotoIds(d, d.key, ['b']);
  expect(d.photoIds).toEqual(['a']);
});
test('remove cover falls back; remove last empties day', () => {
  const d = removePhotoId(day(['a', 'b'], 'b'), 'b')!;
  expect(d.coverId).toBeNull();
  expect(effectiveCoverId(d)).toBe('a');
  expect(removePhotoId(day(['a']), 'a')).toBeNull();
});
test('move up/down, no-op at edges', () => {
  expect(movePhotoId(day(['a', 'b', 'c']), 'c', -1).photoIds).toEqual(['a', 'c', 'b']);
  expect(movePhotoId(day(['a', 'b', 'c']), 'a', 1).photoIds).toEqual(['b', 'a', 'c']);
  expect(movePhotoId(day(['a', 'b']), 'a', -1).photoIds).toEqual(['a', 'b']);
  expect(movePhotoId(day(['a', 'b']), 'b', 1).photoIds).toEqual(['a', 'b']);
});
test('clampComment: lines, length, emoji-safe', () => {
  const fifteen = Array.from({ length: 15 }, (_, i) => `줄${i}`).join('\n');
  expect(commentLineCount(clampComment(fifteen))).toBe(10);
  expect([...clampComment('가'.repeat(400))]).toHaveLength(300);
  const emoji = '가'.repeat(299) + '😀😀';
  expect(clampComment(emoji)).toBe('가'.repeat(299) + '😀');
  expect(commentLineCount('')).toBe(0);
  expect(commentLineCount('a\nb')).toBe(2);
});
test('countRecordedDays counts only that year', () => {
  expect(countRecordedDays(['2026-01-01', '2026-10-07', '2025-10-07'], 2026)).toBe(2);
});
test('backup nudge after 14 days of unbacked changes', () => {
  const D = 86400000;
  let m = markChanged(emptyMeta(), 2026, 0);
  m = markChanged(m, 2026, 5 * D);
  expect(needsBackupNudge(m, 13 * D)).toBe(false);
  expect(needsBackupNudge(m, 14 * D)).toBe(true);
  const b = markBackedUp(m, 2026, 14 * D);
  expect(b.lastBackupAt['2026']).toBe(14 * D);
  expect(needsBackupNudge(b, 30 * D)).toBe(false);
  expect(needsBackupNudge(emptyMeta(), 99 * D)).toBe(false);
});
