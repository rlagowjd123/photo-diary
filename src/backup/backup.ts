import { strFromU8, strToU8, unzip, zip, type Unzipped, type Zippable } from 'fflate';
import type { Day, Photo } from '../core/diary';
import type { DiaryStore, PhotoWithBlob } from '../storage/db';

const APP = 'photo-diary';
const VERSION = 1;

export class BackupError extends Error {
  constructor() {
    super('이 파일은 사진 일기 백업이 아니에요.');
  }
}

export interface BackupData { year: number; days: Day[]; photos: PhotoWithBlob[] }

const zipAsync = (files: Zippable) =>
  new Promise<Uint8Array>((res, rej) => zip(files, { level: 0 }, (err, out) => (err ? rej(err) : res(out))));
const unzipAsync = (data: Uint8Array) =>
  new Promise<Unzipped>((res, rej) => unzip(data, (err, out) => (err ? rej(err) : res(out))));

/** 한 해의 기록을 zip 하나로. diary.json + photos/<id>.jpg */
export async function buildBackup(store: DiaryStore, year: number): Promise<File> {
  const { days, photos } = await store.exportYear(year);
  const files: Zippable = {};
  const meta: Photo[] = [];
  for (const { blob, ...p } of photos) {
    files[`photos/${p.id}.jpg`] = new Uint8Array(await blob.arrayBuffer());
    meta.push(p);
  }
  files['diary.json'] = strToU8(JSON.stringify({ app: APP, version: VERSION, year, days, photos: meta }));
  const out = await zipAsync(files);
  return new File([out as BlobPart], `photo-diary-${year}.zip`, { type: 'application/zip' });
}

export async function readBackup(file: Blob): Promise<BackupData> {
  let entries: Unzipped;
  let json: { app?: string; version?: number; year?: number; days?: Day[]; photos?: Photo[] };
  try {
    entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
    json = JSON.parse(strFromU8(entries['diary.json']));
  } catch {
    throw new BackupError();
  }
  if (json.app !== APP || json.version !== VERSION || typeof json.year !== 'number' || !Array.isArray(json.days) || !Array.isArray(json.photos)) {
    throw new BackupError();
  }
  const photos = json.photos.map((p) => {
    const bytes = entries[`photos/${p.id}.jpg`];
    if (!bytes) throw new BackupError();
    return { ...p, blob: new Blob([bytes as BlobPart], { type: 'image/jpeg' }) };
  });
  return { year: json.year, days: json.days, photos };
}

export async function restoreBackup(store: DiaryStore, data: BackupData): Promise<void> {
  await store.replaceYear(data.year, data.days, data.photos);
  await store.markBackedUp(data.year);
}
