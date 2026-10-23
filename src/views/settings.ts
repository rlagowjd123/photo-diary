import type { DayKey } from '../core/date';
import type { BackupMeta } from '../core/diary';

export const SETTINGS_NOTE = "사진과 일기는 이 폰 안에만 있어요. 가끔 백업해서 '파일' 앱(iCloud Drive)에 보관하세요.";

/** 불러오기 전 확인 문구: 지금 기록이 지워지고, 백업에 없는 날은 사라진다는 것을 숫자로 알린다. */
export function restoreWarning(year: number, backupKeys: DayKey[], currentKeys: DayKey[]): string {
  const prefix = `${year}-`;
  const current = currentKeys.filter((k) => k.startsWith(prefix));
  const inBackup = new Set(backupKeys);
  const lost = current.filter((k) => !inBackup.has(k)).length;
  const head = `지금 폰에 있는 ${year}년 기록(${current.length}일)을 지우고 백업 파일의 기록(${backupKeys.length}일)으로 바꿔요.`;
  return lost ? `${head} 백업에 없는 ${lost}일은 사라지고 되돌릴 수 없어요.` : `${head} 되돌릴 수 없어요.`;
}

/** 설정 화면에 보일 내용: 기록이 있는 연도(최근 먼저)와 마지막 백업 날짜. */
export function settingsInfo(keys: DayKey[], meta: BackupMeta): { years: number[]; lastBackup: string } {
  const years = [...new Set(keys.map((k) => Number(k.slice(0, 4))))].sort((a, b) => b - a);
  const times = Object.values(meta.lastBackupAt);
  if (!times.length) return { years, lastBackup: '아직 없어요' };
  const d = new Date(Math.max(...times));
  return { years, lastBackup: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일` };
}
