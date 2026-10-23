import { renderDay, type DayPhotoView } from '../../src/views/day';

const ph = (id: string, isCover = false, comment = ''): DayPhotoView => ({ id, url: 'blob:' + id, comment, time: '14:32', isCover });

test('empty day shows big plus', () => {
  const r = document.createElement('div');
  renderDay(r, { key: '2026-10-07', today: '2026-10-23', photos: [], yearAgo: null });
  expect(r.querySelector('.empty-add')!.textContent).toContain('이날의 첫 사진');
  expect(r.querySelector('.empty-add')!.getAttribute('data-act')).toBe('add-here');
  expect(r.querySelector('.fab-wrap')).toBeNull();
});
test('feed renders cover badge, times, comments, empty comment prompt', () => {
  const r = document.createElement('div');
  renderDay(r, { key: '2026-10-07', today: '2026-10-23',
    photos: [ph('a', false, '친구들과 집 앞 카페에서.'), ph('b', true)], yearAgo: null });
  expect(r.querySelectorAll('.shot')).toHaveLength(2);
  expect(r.querySelector('[data-id="b"] .badge')!.textContent).toBe('대표');
  expect(r.querySelector('[data-id="a"] .badge')).toBeNull();
  expect(r.querySelector('[data-id="a"] time')!.textContent).toBe('14:32');
  expect(r.textContent).toContain('친구들과 집 앞 카페에서.');
  expect(r.querySelector('[data-id="b"] .cm.empty')!.textContent).toBe('멘트 달기');
  expect(r.querySelector('.fab-wrap')).not.toBeNull();
  expect(r.textContent).toContain('10월 7일');
  expect(r.textContent).toContain('WED · 2026');
  expect((r.querySelector('[data-act="next-d"]') as HTMLButtonElement).disabled).toBe(false);
});
test('five photos hide plus; yearAgo shows; comments are escaped; no next on today', () => {
  const r = document.createElement('div');
  renderDay(r, { key: '2026-10-23', today: '2026-10-23',
    photos: ['a', 'b', 'c', 'd', 'e'].map((i) => ph(i, i === 'a', '<b>x</b>')),
    yearAgo: { key: '2025-10-23', url: 'blob:y', text: '첫 출근 기념 커피.' } });
  expect(r.querySelector('.fab-wrap')).toBeNull();
  const ya = r.querySelector('.yago')!;
  expect(ya.textContent).toContain('1년 전 오늘');
  expect(ya.textContent).toContain('첫 출근 기념 커피.');
  expect(ya.getAttribute('data-k')).toBe('2025-10-23');
  expect(r.querySelector('.cm b')).toBeNull();
  expect((r.querySelector('[data-act="next-d"]') as HTMLButtonElement).disabled).toBe(true);
});
