import { strFromU8, strToU8, Unzip, UnzipPassThrough, Zip, ZipPassThrough } from 'fflate';
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

/**
 * 한 해의 기록을 zip 하나로: diary.json + photos/<id>.jpg (+ thumbs/<id>.jpg).
 * 사진을 한 장씩 흘려 넣고 결과도 조각 그대로 File로 묶어서, 1년 치를 메모리에 여러 번 복사하지 않는다.
 */
export async function buildBackup(store: DiaryStore, year: number): Promise<File> {
  const { days, photos } = await store.exportYear(year);
  const chunks: Uint8Array[] = [];
  let failed: Error | null = null;
  const zip = new Zip((err, chunk) => {
    if (err) failed = err;
    else chunks.push(chunk);
  });
  const add = (name: string, data: Uint8Array) => {
    const entry = new ZipPassThrough(name);
    zip.add(entry);
    entry.push(data, true);
  };
  const meta: Photo[] = [];
  for (const { blob, thumb, ...p } of photos) {
    add(`photos/${p.id}.jpg`, new Uint8Array(await blob.arrayBuffer()));
    if (thumb) add(`thumbs/${p.id}.jpg`, new Uint8Array(await thumb.arrayBuffer()));
    meta.push(p);
  }
  add('diary.json', strToU8(JSON.stringify({ app: APP, version: VERSION, year, days, photos: meta })));
  zip.end();
  if (failed) throw failed;
  return new File(chunks as BlobPart[], `photo-diary-${year}.zip`, { type: 'application/zip' });
}

/** zip을 조금씩 읽어 파일마다 Blob으로 모은다. */
async function readEntries(file: Blob): Promise<Map<string, Blob>> {
  const out = new Map<string, Blob>();
  let failed = false;
  const unzip = new Unzip((f) => {
    const parts: Uint8Array[] = [];
    f.ondata = (err, data, final) => {
      if (err) return void (failed = true);
      parts.push(data);
      if (final) out.set(f.name, new Blob(parts as BlobPart[]));
    };
    f.start();
  });
  unzip.register(UnzipPassThrough);
  const reader = file.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    unzip.push(value);
  }
  unzip.push(new Uint8Array(0), true);
  if (failed) throw new BackupError();
  return out;
}

export async function readBackup(file: Blob): Promise<BackupData> {
  try {
    const entries = await readEntries(file);
    const jsonBlob = entries.get('diary.json');
    if (!jsonBlob) throw new BackupError();
    const json = JSON.parse(strFromU8(new Uint8Array(await jsonBlob.arrayBuffer())));
    if (!json || json.app !== APP || json.version !== VERSION || typeof json.year !== 'number' || !Array.isArray(json.days) || !Array.isArray(json.photos)) {
      throw new BackupError();
    }
    const photos: PhotoWithBlob[] = (json.photos as Photo[]).map((p) => {
      const blob = entries.get(`photos/${p.id}.jpg`);
      if (!blob) throw new BackupError();
      const rec: PhotoWithBlob = { ...p, blob: new Blob([blob], { type: 'image/jpeg' }) };
      const thumb = entries.get(`thumbs/${p.id}.jpg`);
      if (thumb) rec.thumb = new Blob([thumb], { type: 'image/jpeg' });
      return rec;
    });
    return { year: json.year, days: json.days, photos };
  } catch {
    throw new BackupError();
  }
}

export async function restoreBackup(store: DiaryStore, data: BackupData): Promise<void> {
  await store.replaceYear(data.year, data.days, data.photos);
  await store.markBackedUp(data.year);
}
