import { isFuture, monthGrid, type DayKey } from '../core/date';

export interface CalendarView {
  year: number;
  month0: number;
  today: DayKey;
  /** 날짜 키 → 대표사진 URL */
  covers: Record<DayKey, string>;
  showNudge: boolean;
  canGoNext: boolean;
  dir?: string;
}

export function renderCalendar(root: HTMLElement, v: CalendarView): void {
  const head = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w) => `<div class="wd" aria-hidden="true">${w}</div>`).join('');
  const cells = monthGrid(v.year, v.month0)
    .map((k) => {
      if (!k) return '<div></div>';
      const d = Number(k.slice(8));
      const url = v.covers[k];
      const fut = isFuture(k, v.today);
      const cls = ['cell', url ? 'has' : '', k === v.today ? 'today' : '', fut ? 'future' : ''].filter(Boolean).join(' ');
      const label = `${v.month0 + 1}월 ${d}일${url ? ', 기록 있음' : ''}`;
      return `<button class="${cls}" data-k="${k}" ${fut ? 'disabled' : 'data-act="open-day"'} aria-label="${label}">${url ? `<img src="${url}" alt="">` : ''}<span>${d}</span></button>`;
    })
    .join('');
  root.innerHTML = `
    <div class="cal-top">
      <button class="lbl" data-act="to-cover" aria-label="표지로">${v.year}</button>
      <button class="settings" data-act="settings">설정${v.showNudge ? '<i class="dot" aria-label="백업할 때가 됐어요"></i>' : ''}</button>
    </div>
    <div class="mo-row">
      <h1>${v.month0 + 1}월</h1>
      <button class="arrow" data-act="prev-m" aria-label="지난달">‹</button>
      <button class="arrow" data-act="next-m" aria-label="다음달"${v.canGoNext ? '' : ' disabled'}>›</button>
    </div>
    <div class="grid ${v.dir ?? ''}">${head}${cells}</div>
    <div class="cal-hint">‹ 옆으로 밀어 넘기기 ›</div>
    <div class="cal-plus-wrap"><button class="quiet-plus" data-act="add-today" aria-label="오늘 사진 남기기">+</button></div>`;
}
