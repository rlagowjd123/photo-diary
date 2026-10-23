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

export function forgetUrl(id: string): void {
  const url = cache.get(id);
  if (url) URL.revokeObjectURL(url);
  cache.delete(id);
}

export function forgetAllUrls(): void {
  for (const id of [...cache.keys()]) forgetUrl(id);
}
