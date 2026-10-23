import { APP_NAME } from '../config';
import { coverHeading } from '../core/date';

export function renderCover(root: HTMLElement, v: { now: Date; recordedThisYear: number }): void {
  const h = coverHeading(v.now);
  const n = v.recordedThisYear;
  root.innerHTML = `
    <div class="brand lbl">${APP_NAME}</div>
    <div class="num">${h.num}</div>
    <div class="when lbl">${h.label}</div>
    <div class="rule"></div>
    <div class="count">${n ? `올해 ${n}일을 남겼어요.` : '오늘 첫 페이지를 남겨보세요.'}</div>
    <div class="foot">
      <button class="quiet-plus" data-act="add-today" aria-label="오늘 사진 남기기">+</button>
      <div class="lbl">TOUCH TO OPEN</div>
    </div>`;
}
