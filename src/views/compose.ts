import { dayHeading, type DayKey } from '../core/date';
import { clampComment } from '../core/diary';
import { bindCommentLimit, COMMENT_PLACEHOLDER } from '../ui/sheet';

export function renderCompose(root: HTMLElement, v: { key: DayKey; photos: { id: string; url: string }[] }): void {
  const h = dayHeading(v.key);
  const list = v.photos
    .map((p) => `
      <div>
        <img src="${p.url}" alt="">
        <textarea id="c_${p.id}" data-id="${p.id}" rows="3" placeholder="${COMMENT_PLACEHOLDER}" aria-label="멘트"></textarea>
        <div class="counter"></div>
      </div>`)
    .join('');
  root.innerHTML = `
    <div class="day-head"><button data-act="comp-later">나중에 쓰기</button><span class="lbl">사진은 이미 저장됐어요</span></div>
    <div class="day-title" style="margin-bottom:0"><div class="lbl">${h.label}</div><h1>${h.title}</h1></div>
    <div class="comp-list">${list}</div>
    <button class="btn-ink" data-act="comp-save">저장</button>`;
  root.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((ta) => {
    bindCommentLimit(ta, ta.nextElementSibling as HTMLElement);
  });
}

/** 사진 id → 잘리고 앞뒤 공백이 지워진 멘트 */
export function readCompose(root: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  root.querySelectorAll<HTMLTextAreaElement>('textarea[data-id]').forEach((ta) => {
    out[ta.dataset.id!] = clampComment(ta.value.trim());
  });
  return out;
}
