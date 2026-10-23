import { MAX_PHOTOS_PER_DAY } from '../config';
import { dayHeading, type DayKey } from '../core/date';
import { esc } from '../ui/esc';

export interface DayPhotoView { id: string; url: string; comment: string; time: string; isCover: boolean }

export interface DayViewModel {
  key: DayKey;
  today: DayKey;
  photos: DayPhotoView[];
  yearAgo: { key: DayKey; url: string; text: string } | null;
  dir?: string;
}

function shot(p: DayPhotoView): string {
  const cm = p.comment
    ? `<p class="cm" data-act="edit" data-id="${p.id}">${esc(p.comment)}</p>`
    : `<p class="cm empty" data-act="edit" data-id="${p.id}">멘트 달기</p>`;
  return `
    <figure class="shot" data-id="${p.id}">
      <div class="frame">
        <img src="${p.url}" alt="${esc(p.comment || '사진')}">
        ${p.isCover ? '<span class="badge">대표</span>' : ''}
      </div>
      <figcaption class="cap"><time>${p.time}</time>${cm}</figcaption>
    </figure>`;
}

export function renderDay(root: HTMLElement, v: DayViewModel): void {
  const h = dayHeading(v.key);
  const n = v.photos.length;
  const feed = n
    ? v.photos.map(shot).join('')
    : '<button class="empty-add" data-act="add-here"><b aria-hidden="true">+</b><small>이날의 첫 사진</small></button>';
  const ya = v.yearAgo
    ? `<button class="yago" data-act="open-day" data-k="${v.yearAgo.key}">
         <img src="${v.yearAgo.url}" alt="">
         <div><div class="lbl">1년 전 오늘</div><p>${esc(v.yearAgo.text)}</p></div>
       </button>`
    : '';
  const fab = n > 0 && n < MAX_PHOTOS_PER_DAY
    ? '<div class="fab-wrap"><button class="quiet-plus" data-act="add-here" aria-label="사진 더하기">+</button></div>'
    : '';
  root.innerHTML = `
    <div class="day-head">
      <button data-act="to-cal">‹ 달력</button>
      <span>
        <button class="arrow" data-act="prev-d" aria-label="전날">‹</button>
        <button class="arrow" data-act="next-d" aria-label="다음날"${v.key >= v.today ? ' disabled' : ''}>›</button>
      </span>
    </div>
    <div class="${v.dir ?? ''}">
      <div class="day-title"><div class="lbl">${h.label}</div><h1>${h.title}</h1></div>
      <div class="feed">${feed}</div>
      ${ya}
    </div>
    ${fab}`;
}
