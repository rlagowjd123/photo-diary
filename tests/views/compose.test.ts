import { renderCompose, readCompose } from '../../src/views/compose';

test('compose reads clamped, trimmed comments per photo', () => {
  const r = document.createElement('div');
  renderCompose(r, { key: '2026-10-07', photos: [{ id: 'a', url: 'blob:a' }, { id: 'b', url: 'blob:b' }] });
  (r.querySelector('#c_a') as HTMLTextAreaElement).value = '  친구 수진이와  ';
  (r.querySelector('#c_b') as HTMLTextAreaElement).value = Array(12).fill('x').join('\n');
  const out = readCompose(r);
  expect(out.a).toBe('친구 수진이와');
  expect(out.b.split('\n')).toHaveLength(10);
  expect(r.textContent).toContain('사진은 이미 저장됐어요');
  expect(r.textContent).toContain('10월 7일');
  expect(r.querySelector('[data-act="comp-save"]')!.textContent).toBe('저장');
  expect(r.querySelector('[data-act="comp-later"]')!.textContent).toBe('나중에 쓰기');
  expect(r.querySelectorAll('.counter')).toHaveLength(2);
});
