// @vitest-environment node
import { openStore, type NewPhoto } from '../../src/storage/db';

const p = (t = 0): NewPhoto => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), takenAt: t, width: 10, height: 10 });
const fresh = () => openStore('t-' + crypto.randomUUID());

test('addPhotos persists immediately and caps at 5', async () => {
  const s = await fresh();
  await s.addPhotos('2026-10-07', [p(), p(), p()]);
  const r = await s.addPhotos('2026-10-07', [p(), p(), p(), p()]);
  expect(r.accepted).toHaveLength(2);
  expect(r.rejected).toBe(2);
  expect((await s.getDay('2026-10-07'))!.photoIds).toHaveLength(5);
  expect(await s.getPhotoBlob(r.accepted[0].id)).toBeInstanceOf(Blob);
  expect(r.accepted[0].dayKey).toBe('2026-10-07');
});
test('comment is clamped and saved', async () => {
  const s = await fresh();
  const { accepted: [ph] } = await s.addPhotos('2026-10-07', [p()]);
  await s.updateComment(ph.id, Array(12).fill('a').join('\n'));
  expect((await s.getPhoto(ph.id))!.comment.split('\n')).toHaveLength(10);
});
test('deleting last photo removes the day', async () => {
  const s = await fresh();
  const { accepted: [ph] } = await s.addPhotos('2026-10-07', [p()]);
  await s.deletePhoto(ph.id);
  expect(await s.getDay('2026-10-07')).toBeUndefined();
  expect(await s.allDayKeys()).toEqual([]);
  expect(await s.getPhotoBlob(ph.id)).toBeUndefined();
});
test('deleting the cover falls back to first photo', async () => {
  const s = await fresh();
  const { accepted } = await s.addPhotos('2026-10-07', [p(), p()]);
  await s.setCover('2026-10-07', accepted[1].id);
  await s.deletePhoto(accepted[1].id);
  expect((await s.getDay('2026-10-07'))!.coverId).toBeNull();
});
test('setCover / movePhoto / getDaysBetween', async () => {
  const s = await fresh();
  const { accepted } = await s.addPhotos('2026-10-07', [p(), p()]);
  await s.setCover('2026-10-07', accepted[1].id);
  await s.movePhoto('2026-10-07', accepted[1].id, -1);
  const d = (await s.getDay('2026-10-07'))!;
  expect(d.coverId).toBe(accepted[1].id);
  expect(d.photoIds[0]).toBe(accepted[1].id);
  await s.addPhotos('2026-11-01', [p()]);
  expect((await s.getDaysBetween('2026-10-01', '2026-10-31')).map((x) => x.key)).toEqual(['2026-10-07']);
});
test('replaceYear swaps only that year', async () => {
  const s = await fresh();
  await s.addPhotos('2025-05-05', [p()]);
  const { accepted: [old] } = await s.addPhotos('2026-10-07', [p()]);
  const photo = { id: 'n1', dayKey: '2026-03-03', comment: 'hi', takenAt: 1, width: 1, height: 1, blob: new Blob(['n']) };
  await s.replaceYear(2026, [{ key: '2026-03-03', photoIds: ['n1'], coverId: null }], [photo]);
  expect(await s.allDayKeys()).toEqual(['2025-05-05', '2026-03-03']);
  expect(await s.getPhoto(old.id)).toBeUndefined();
  expect((await s.getPhoto('n1'))!.comment).toBe('hi');
});
test('exportYear returns that year with blobs', async () => {
  const s = await fresh();
  await s.addPhotos('2025-05-05', [p()]);
  await s.addPhotos('2026-10-07', [p(), p()]);
  const out = await s.exportYear(2026);
  expect(out.days.map((d) => d.key)).toEqual(['2026-10-07']);
  expect(out.photos).toHaveLength(2);
  expect(out.photos[0].blob).toBeInstanceOf(Blob);
});
test('changes mark meta pending; markBackedUp clears it', async () => {
  const s = await fresh();
  await s.addPhotos('2026-10-07', [p()], 1000);
  expect((await s.getMeta()).pendingSince['2026']).toBe(1000);
  await s.markBackedUp(2026, 5000);
  const m = await s.getMeta();
  expect(m.pendingSince['2026']).toBeUndefined();
  expect(m.lastBackupAt['2026']).toBe(5000);
});

test('thumbnail is stored and served; falls back to full photo when missing', async () => {
  const s = await fresh();
  const withThumb = { ...p(), thumb: new Blob(['small']) };
  const { accepted: [a, b] } = await s.addPhotos('2026-10-07', [withThumb, p()]);
  expect(await (await s.getThumbBlob(a.id))!.text()).toBe('small');
  expect(await (await s.getThumbBlob(b.id))!.text()).toBe('x');
  expect(await s.getThumbBlob('nope')).toBeUndefined();
  expect(await s.getPhoto(a.id)).not.toHaveProperty('thumb');
});
