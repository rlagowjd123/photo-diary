import type { DayKey } from '../core/date';
import type { BackupMeta } from '../core/diary';

export const SETTINGS_NOTE = "사진과 일기는 이 폰 안에만 있어요. 가끔 백업해서 '파일' 앱(iCloud Drive)에 보관하세요.";

/** 설정 화면에 보일 내용: 기록이 있는 연도(최근 먼저)와 마지막 백업 날짜. */
export function settingsInfo(keys: DayKey[], meta: BackupMeta): { years: number[]; lastBackup: string } {
  const years = [...new Set(keys.map((k) => Number(k.slice(0, 4))))].sort((a, b) => b - a);
  const times = Object.values(meta.lastBackupAt);
  if (!times.length) return { years, lastBackup: '아직 없어요' };
  const d = new Date(Math.max(...times));
  return { years, lastBackup: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일` };
}
