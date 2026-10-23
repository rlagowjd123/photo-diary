// @vitest-environment node
import { Window } from 'happy-dom';
import { openStore, type NewPhoto } from '../../src/storage/db';

const win = new Window();
Object.assign(globalThis, { document: win.document, HTMLElement: win.HTMLElement, Event: win.Event });
(globalThis as any).URL.createObjectURL ??= () => 'blob:x';

const { App } = await import('../../src/app');
const ph = (): NewPhoto => ({ blob: new Blob(['x']), takenAt: 0, width: 1, height: 1 });

test('rapid day changes: the last requested day wins both screen and state', async () => {
  const store = await openStore('t-' + crypto.randomUUID());
  await store.addPhotos('2026-10-21', [ph(), ph(), ph(), ph(), ph()]); // slow to render
  const root = document.createElement('div') as unknown as HTMLElement;
  const app = new App(root, store, () => new Date(2026, 9, 23));
  const a = app.showDay('2026-10-21', 'slide-l');
  const b = app.showDay('2026-10-22', 'slide-l');
  await Promise.all([a, b]);
  expect(app.dayKey).toBe('2026-10-22');
  expect(app.views.day.querySelector('h1')!.textContent).toBe('10월 22일');
});

test('rapid month changes: the last requested month wins', async () => {
  const store = await openStore('t-' + crypto.randomUUID());
  await store.addPhotos('2026-09-03', [ph()]);
  const root = document.createElement('div') as unknown as HTMLElement;
  const app = new App(root, store, () => new Date(2026, 9, 23));
  await Promise.all([app.showCalendar(2026, 8), app.showCalendar(2026, 7)]);
  expect(app.calM).toBe(7);
  expect(app.views.cal.querySelector('h1')!.textContent).toBe('8월');
});

test('"나중에 쓰기" keeps text already typed', async () => {
  const store = await openStore('t-' + crypto.randomUUID());
  const { accepted } = await store.addPhotos('2026-10-23', [ph(), ph()]);
  const root = document.createElement('div') as unknown as HTMLElement;
  const app = new App(root, store, () => new Date(2026, 9, 23));
  await app.showCompose('2026-10-23', accepted.map((p) => p.id));
  (app.views.compose.querySelector(`#c_${accepted[0].id}`) as HTMLTextAreaElement).value = '친구 수진이와';
  const later = app.views.compose.querySelector('[data-act="comp-later"]') as HTMLElement;
  await app['act']('comp-later', later);
  expect((await store.getPhoto(accepted[0].id))!.comment).toBe('친구 수진이와');
  expect((await store.getPhoto(accepted[1].id))!.comment).toBe('');
});
