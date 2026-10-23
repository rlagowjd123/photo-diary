import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { DayKey } from '../core/date';
import {
  appendPhotoIds, clampComment, emptyMeta, markBackedUp as metaBackedUp, markChanged,
  movePhotoId, removePhotoId, setCoverId,
  type BackupMeta, type Day, type Photo,
} from '../core/diary';

export interface NewPhoto { blob: Blob; takenAt: number; width: number; height: number }
export type PhotoWithBlob = Photo & { blob: Blob };

interface Schema extends DBSchema {
  days: { key: string; value: Day };
  photos: { key: string; value: PhotoWithBlob; indexes: { dayKey: string } };
  meta: { key: string; value: BackupMeta };
}

type DB = IDBPDatabase<Schema>;
type RW = IDBPTransaction<Schema, ('days' | 'photos' | 'meta')[], 'readwrite'>;

export interface DiaryStore {
  getDay(key: DayKey): Promise<Day | undefined>;
  getDaysBetween(from: DayKey, to: DayKey): Promise<Day[]>;
  allDayKeys(): Promise<DayKey[]>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getPhotoBlob(id: string): Promise<Blob | undefined>;
  addPhotos(key: DayKey, items: NewPhoto[], now?: number): Promise<{ accepted: Photo[]; rejected: number }>;
  updateComment(id: string, text: string): Promise<void>;
  setCover(key: DayKey, id: string): Promise<void>;
  movePhoto(key: DayKey, id: string, dir: -1 | 1): Promise<void>;
  deletePhoto(id: string): Promise<void>;
  getMeta(): Promise<BackupMeta>;
  markBackedUp(year: number, now?: number): Promise<void>;
  exportYear(year: number): Promise<{ days: Day[]; photos: PhotoWithBlob[] }>;
  replaceYear(year: number, days: Day[], photos: PhotoWithBlob[]): Promise<void>;
}

const META_KEY = 'backup';
const yearOf = (k: DayKey) => Number(k.slice(0, 4));
const yearRange = (year: number) => IDBKeyRange.bound(`${year}-01-01`, `${year}-12-31`);
const stripBlob = ({ blob: _b, ...rest }: PhotoWithBlob): Photo => rest;

async function touch(tx: RW, key: DayKey, now: number) {
  const meta = (await tx.objectStore('meta').get(META_KEY)) ?? emptyMeta();
  await tx.objectStore('meta').put(markChanged(meta, yearOf(key), now), META_KEY);
}

async function putDay(tx: RW, key: DayKey, day: Day | null) {
  if (day) await tx.objectStore('days').put(day);
  else await tx.objectStore('days').delete(key);
}

export async function openStore(dbName = 'photo-diary'): Promise<DiaryStore> {
  const db: DB = await openDB<Schema>(dbName, 1, {
    upgrade(d) {
      d.createObjectStore('days', { keyPath: 'key' });
      d.createObjectStore('photos', { keyPath: 'id' }).createIndex('dayKey', 'dayKey');
      d.createObjectStore('meta');
    },
  });
  const rw = () => db.transaction(['days', 'photos', 'meta'], 'readwrite') as RW;

  /** Day 하나를 바꾸는 공통 경로: 읽고, 바꾸고, 저장하고, 변경 기록. */
  async function editDay(key: DayKey, fn: (d: Day) => Day | null, extra?: (tx: RW) => Promise<void>) {
    const tx = rw();
    const day = await tx.objectStore('days').get(key);
    if (day) {
      await putDay(tx, key, fn(day));
      if (extra) await extra(tx);
      await touch(tx, key, Date.now());
    }
    await tx.done;
  }

  return {
    getDay: (key) => db.get('days', key),
    getDaysBetween: (from, to) => db.getAll('days', IDBKeyRange.bound(from, to)),
    allDayKeys: async () => (await db.getAllKeys('days')) as DayKey[],
    async getPhoto(id) {
      const p = await db.get('photos', id);
      return p && stripBlob(p);
    },
    async getPhotoBlob(id) {
      return (await db.get('photos', id))?.blob;
    },

    async addPhotos(key, items, now = Date.now()) {
      const tx = rw();
      const current = await tx.objectStore('days').get(key);
      const ids = items.map(() => crypto.randomUUID());
      const { day, accepted, rejected } = appendPhotoIds(current, key, ids);
      const photos: Photo[] = [];
      for (const [i, id] of ids.entries()) {
        if (!accepted.includes(id)) continue;
        const it = items[i];
        const rec: PhotoWithBlob = { id, dayKey: key, comment: '', takenAt: it.takenAt, width: it.width, height: it.height, blob: it.blob };
        await tx.objectStore('photos').put(rec);
        photos.push(stripBlob(rec));
      }
      if (accepted.length) {
        await tx.objectStore('days').put(day);
        await touch(tx, key, now);
      }
      await tx.done;
      return { accepted: photos, rejected };
    },

    async updateComment(id, text) {
      const tx = rw();
      const p = await tx.objectStore('photos').get(id);
      if (p) {
        await tx.objectStore('photos').put({ ...p, comment: clampComment(text) });
        await touch(tx, p.dayKey, Date.now());
      }
      await tx.done;
    },

    setCover: (key, id) => editDay(key, (d) => setCoverId(d, id)),
    movePhoto: (key, id, dir) => editDay(key, (d) => movePhotoId(d, id, dir)),

    async deletePhoto(id) {
      const p = await db.get('photos', id);
      if (!p) return;
      await editDay(p.dayKey, (d) => removePhotoId(d, id), (tx) => tx.objectStore('photos').delete(id));
    },

    async getMeta() {
      return (await db.get('meta', META_KEY)) ?? emptyMeta();
    },
    async markBackedUp(year, now = Date.now()) {
      const tx = rw();
      const meta = (await tx.objectStore('meta').get(META_KEY)) ?? emptyMeta();
      await tx.objectStore('meta').put(metaBackedUp(meta, year, now), META_KEY);
      await tx.done;
    },

    async exportYear(year) {
      const days = await db.getAll('days', yearRange(year));
      const photos = await db.getAllFromIndex('photos', 'dayKey', yearRange(year));
      return { days, photos };
    },

    async replaceYear(year, days, photos) {
      const tx = rw();
      const dayStore = tx.objectStore('days');
      const photoStore = tx.objectStore('photos');
      await dayStore.delete(yearRange(year));
      for (const id of await photoStore.index('dayKey').getAllKeys(yearRange(year))) await photoStore.delete(id);
      for (const d of days) await dayStore.put(d);
      for (const p of photos) await photoStore.put(p);
      await tx.done;
    },
  };
}
