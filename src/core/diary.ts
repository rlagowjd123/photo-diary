import { BACKUP_NUDGE_DAYS, MAX_COMMENT_CHARS, MAX_COMMENT_LINES, MAX_PHOTOS_PER_DAY } from '../config';
import type { DayKey } from './date';

export interface Photo {
  id: string;
  dayKey: DayKey;
  comment: string;
  takenAt: number;
  width: number;
  height: number;
}

export interface Day {
  key: DayKey;
  photoIds: string[];
  coverId: string | null;
}

/** 따로 정한 대표사진이 있으면 그것, 없으면 첫 사진. */
export function effectiveCoverId(day: Day): string | null {
  if (day.coverId && day.photoIds.includes(day.coverId)) return day.coverId;
  return day.photoIds[0] ?? null;
}

export function appendPhotoIds(day: Day | undefined, key: DayKey, ids: string[]) {
  const base: Day = day ?? { key, photoIds: [], coverId: null };
  const room = Math.max(0, MAX_PHOTOS_PER_DAY - base.photoIds.length);
  const accepted = ids.slice(0, room);
  return {
    day: { ...base, photoIds: [...base.photoIds, ...accepted] },
    accepted,
    rejected: ids.length - accepted.length,
  };
}

export function movePhotoId(day: Day, id: string, dir: -1 | 1): Day {
  const ids = [...day.photoIds];
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ...day, photoIds: ids };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return { ...day, photoIds: ids };
}

/** 마지막 사진을 지우면 null (그날 기록이 사라짐). */
export function removePhotoId(day: Day, id: string): Day | null {
  const ids = day.photoIds.filter((x) => x !== id);
  if (!ids.length) return null;
  return { ...day, photoIds: ids, coverId: day.coverId === id ? null : day.coverId };
}

export function setCoverId(day: Day, id: string): Day {
  return { ...day, coverId: id };
}

/** 10줄, 300자(이모지가 쪼개지지 않게 코드 포인트 기준). */
export function clampComment(text: string): string {
  const lines = text.split('\n').slice(0, MAX_COMMENT_LINES).join('\n');
  return Array.from(lines).slice(0, MAX_COMMENT_CHARS).join('');
}

export function commentLineCount(text: string): number {
  return text ? text.split('\n').length : 0;
}

export function countRecordedDays(keys: DayKey[], year: number): number {
  const prefix = `${year}-`;
  return keys.filter((k) => k.startsWith(prefix)).length;
}

/** 키는 연도 문자열. pendingSince = 백업 뒤 처음 바뀐 시각. */
export interface BackupMeta {
  lastBackupAt: Record<string, number>;
  pendingSince: Record<string, number>;
}

export function emptyMeta(): BackupMeta {
  return { lastBackupAt: {}, pendingSince: {} };
}

export function markChanged(m: BackupMeta, year: number, now: number): BackupMeta {
  const y = String(year);
  if (m.pendingSince[y] !== undefined) return m;
  return { ...m, pendingSince: { ...m.pendingSince, [y]: now } };
}

export function markBackedUp(m: BackupMeta, year: number, now: number): BackupMeta {
  const y = String(year);
  const pendingSince = { ...m.pendingSince };
  delete pendingSince[y];
  return { lastBackupAt: { ...m.lastBackupAt, [y]: now }, pendingSince };
}

export function needsBackupNudge(m: BackupMeta, now: number): boolean {
  const limit = BACKUP_NUDGE_DAYS * 86400000;
  return Object.values(m.pendingSince).some((since) => now - since >= limit);
}
