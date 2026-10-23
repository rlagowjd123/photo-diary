import { openSheet, confirmSheet, editorSheet, isSheetOpen } from '../../src/ui/sheet';
import { esc } from '../../src/ui/esc';

afterEach(() => { document.body.innerHTML = ''; });

test('openSheet resolves with chosen value, null on cancel', async () => {
  const p = openSheet({ title: 't', items: [{ label: '카메라로 찍기', value: 'cam' }] });
  expect(isSheetOpen()).toBe(true);
  (document.querySelector('[data-value="cam"]') as HTMLElement).click();
  expect(await p).toBe('cam');
  expect(isSheetOpen()).toBe(false);
  const q = openSheet({ title: 't', items: [] });
  (document.querySelector('[data-cancel]') as HTMLElement).click();
  expect(await q).toBeNull();
});
test('scrim tap cancels', async () => {
  const p = openSheet({ title: 't', items: [{ label: 'a', value: 'a' }] });
  (document.querySelector('.scrim') as HTMLElement).click();
  expect(await p).toBeNull();
});
test('confirmSheet true/false', async () => {
  const p = confirmSheet('사진 삭제', '지울까요?', '삭제');
  (document.querySelector('[data-ok]') as HTMLElement).click();
  expect(await p).toBe(true);
  const q = confirmSheet('사진 삭제', '지울까요?', '삭제');
  (document.querySelector('[data-cancel]') as HTMLElement).click();
  expect(await q).toBe(false);
});
test('editorSheet clamps and returns trimmed text', async () => {
  const p = editorSheet('old');
  const ta = document.querySelector('textarea') as HTMLTextAreaElement;
  expect(ta.value).toBe('old');
  ta.value = Array(12).fill('x').join('\n') + '  ';
  ta.dispatchEvent(new Event('input'));
  expect(document.querySelector('.counter')!.textContent).toBe('10 / 10줄');
  (document.querySelector('[data-ok]') as HTMLElement).click();
  expect((await p)!.split('\n')).toHaveLength(10);
});
test('esc', () => {
  expect(esc('<b>"&')).toBe('&lt;b&gt;&quot;&amp;');
});
