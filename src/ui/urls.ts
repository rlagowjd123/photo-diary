import type { DiaryStore } from '../storage/db';

const cache = new Map<string, string>();

/** 사진 id → objectURL (한 번 만들면 재사용). */
export async function photoUrl(store: DiaryStore, id: string): Promise<string> {
  const hit = cache.get(id);
  if (hit) return hit;
  const blob = await store.getPhotoBlob(id);
  const url = blob ? URL.createObjectURL(blob) : '';
  if (url) cache.set(id, url);
  return url;
}

/** 달력·1년 전 오늘에 쓰는 작은 사진 URL. */
export async function thumbUrl(store: DiaryStore, id: string): Promise<string> {
  const key = `t:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const blob = await store.getThumbBlob(id);
  const url = blob ? URL.createObjectURL(blob) : '';
  if (url) cache.set(key, url);
  return url;
}

export function forgetUrl(id: string): void {
  for (const key of [id, `t:${id}`]) {
    const url = cache.get(key);
    if (url) URL.revokeObjectURL(url);
    cache.delete(key);
  }
}

export function forgetAllUrls(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}
