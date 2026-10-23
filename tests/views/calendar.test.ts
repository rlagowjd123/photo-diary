import { renderCalendar } from '../../src/views/calendar';

test('calendar fills recorded days, marks today, blocks future', () => {
  const root = document.createElement('div');
  renderCalendar(root, { year: 2026, month0: 9, today: '2026-10-23',
    covers: { '2026-10-07': 'blob:a' }, showNudge: true, canGoNext: false });
  const c7 = root.querySelector('[data-k="2026-10-07"]')!;
  expect(c7.classList.contains('has')).toBe(true);
  expect(c7.querySelector('img')!.getAttribute('src')).toBe('blob:a');
  expect(root.querySelector('[data-k="2026-10-08"]')!.classList.contains('has')).toBe(false);
  expect(root.querySelector('[data-k="2026-10-23"]')!.classList.contains('today')).toBe(true);
  expect((root.querySelector('[data-k="2026-10-24"]') as HTMLButtonElement).disabled).toBe(true);
  expect(root.querySelector('.dot')).not.toBeNull();
  expect((root.querySelector('[data-act="next-m"]') as HTMLButtonElement).disabled).toBe(true);
  expect(root.textContent).toContain('10월');
  expect(root.querySelector('[data-act="add-today"]')).not.toBeNull();
  expect(root.querySelector('[data-act="to-cover"]')!.textContent).toBe('2026');
});
test('no nudge dot, next enabled for past month', () => {
  const root = document.createElement('div');
  renderCalendar(root, { year: 2026, month0: 8, today: '2026-10-23', covers: {}, showNudge: false, canGoNext: true });
  expect(root.querySelector('.dot')).toBeNull();
  expect((root.querySelector('[data-act="next-m"]') as HTMLButtonElement).disabled).toBe(false);
  expect(root.querySelectorAll('.cell')).toHaveLength(30);
});
