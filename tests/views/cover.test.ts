import { renderCover } from '../../src/views/cover';

test('cover shows date, count and quiet plus', () => {
  const root = document.createElement('div');
  renderCover(root, { now: new Date(2026, 9, 22), recordedThisYear: 42 });
  expect(root.textContent).toContain('22');
  expect(root.textContent).toContain('OCTOBER · THURSDAY');
  expect(root.textContent).toContain('올해 42일을 남겼어요.');
  expect(root.textContent).toContain('TOUCH TO OPEN');
  expect(root.querySelector('[data-act="add-today"]')).not.toBeNull();
  renderCover(root, { now: new Date(2026, 9, 22), recordedThisYear: 0 });
  expect(root.textContent).toContain('오늘 첫 페이지를 남겨보세요.');
});
