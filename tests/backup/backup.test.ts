// @vitest-environment node
import { strToU8, zipSync } from 'fflate';
import { BackupError, buildBackup, readBackup, restoreBackup } from '../../src/backup/backup';
import { openStore } from '../../src/storage/db';

const fresh = () => openStore('t-' + crypto.randomUUID());

test('backup round-trip restores a year exactly', async () => {
  const a = await fresh();
  const { accepted } = await a.addPhotos('2026-10-07', [{ blob: new Blob(['jpg1']), takenAt: 5, width: 2, height: 3 }]);
  await a.updateComment(accepted[0].id, '친구 수진이와');
  await a.addPhotos('2025-01-01', [{ blob: new Blob(['other year']), takenAt: 0, width: 1, height: 1 }]);
  const file = await buildBackup(a, 2026);
  expect(file.name).toBe('photo-diary-2026.zip');

  const b = await fresh();
  await b.addPhotos('2026-01-01', [{ blob: new Blob(['old']), takenAt: 0, width: 1, height: 1 }]);
  const data = await readBackup(file);
  expect(data.year).toBe(2026);
  await restoreBackup(b, data);
  expect(await b.allDayKeys()).toEqual(['2026-10-07']);
  const ph = (await b.getPhoto(accepted[0].id))!;
  expect(ph.comment).toBe('친구 수진이와');
  expect(ph.takenAt).toBe(5);
  expect(await (await b.getPhotoBlob(accepted[0].id))!.text()).toBe('jpg1');
  expect((await b.getMeta()).pendingSince['2026']).toBeUndefined();
});

test('foreign or broken files are rejected and nothing changes', async () => {
  const s = await fresh();
  await s.addPhotos('2026-10-07', [{ blob: new Blob(['x']), takenAt: 0, width: 1, height: 1 }]);
  await expect(readBackup(new Blob(['garbage']))).rejects.toThrow('이 파일은 사진 일기 백업이 아니에요.');
  const other = new Blob([zipSync({ 'diary.json': strToU8('{"app":"other"}') })]);
  await expect(readBackup(other)).rejects.toBeInstanceOf(BackupError);
  const missing = new Blob([zipSync({ 'diary.json': strToU8(JSON.stringify({
    app: 'photo-diary', version: 1, year: 2026,
    days: [{ key: '2026-10-07', photoIds: ['p1'], coverId: null }],
    photos: [{ id: 'p1', dayKey: '2026-10-07', comment: '', takenAt: 0, width: 1, height: 1 }],
  })) })]);
  await expect(readBackup(missing)).rejects.toBeInstanceOf(BackupError);
  expect(await s.allDayKeys()).toEqual(['2026-10-07']);
});
