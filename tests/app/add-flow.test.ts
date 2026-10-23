// @vitest-environment node
import { Window } from 'happy-dom';
import { openStore, type NewPhoto } from '../../src/storage/db';

vi.mock('../../src/media/image', () => ({
  shrinkImage: vi.fn(async () => ({ blob: new Blob(['j'], { type: 'image/jpeg' }), width: 10, height: 10 })),
  readTakenAt: vi.fn(async (_f: File, fb: number) => fb),
}));

// 저장소는 Node Blob이 필요하고(복제 가능), 화면은 DOM이 필요해서 happy-dom 창을 직접 붙인다.
const win = new Window();
Object.assign(globalThis, { document: win.document, HTMLElement: win.HTMLElement, Event: win.Event });
(globalThis as any).URL.createObjectURL ??= () => 'blob:x';

const { App } = await import('../../src/app');

const old = (): NewPhoto => ({ blob: new Blob(['x']), takenAt: 0, width: 1, height: 1 });

test('photos are stored before any comment is written, overflow reported', async () => {
  const store = await openStore('t-' + crypto.randomUUID());
  await store.addPhotos('2026-10-07', [old(), old(), old()]);
  const app = new App(document.createElement('div') as unknown as HTMLElement, store, () => new Date(2026, 9, 23));
  const files = Array.from({ length: 4 }, (_, i) => new File(['x'], `${i}.jpg`, { type: 'image/jpeg', lastModified: 1000 + i }));
  const ids = await app.addFiles('2026-10-07', files, false);
  expect(ids).toHaveLength(2);
  expect((await store.getDay('2026-10-07'))!.photoIds).toHaveLength(5);
  expect((await store.getPhoto(ids[0]))!.takenAt).toBe(1000);
  expect(document.body.textContent).toContain('2장은 하루 5장 제한으로 빠졌어요.');
});

test('camera photos use now as taken time', async () => {
  const store = await openStore('t-' + crypto.randomUUID());
  const app = new App(document.createElement('div') as unknown as HTMLElement, store, () => new Date(2026, 9, 23));
  const before = Date.now();
  const [id] = await app.addFiles('2026-10-23', [new File(['x'], 'c.jpg', { lastModified: 5 })], true);
  expect((await store.getPhoto(id))!.takenAt).toBeGreaterThanOrEqual(before);
});
