import { MAX_COMMENT_LINES } from '../config';
import { clampComment, commentLineCount } from '../core/diary';
import { esc } from './esc';

type Done = (v: unknown) => void;
let layer: HTMLElement | null = null;
let settle: Done | null = null;

export function isSheetOpen(): boolean {
  return !!layer;
}

/** 열려 있는 시트를 닫는다. 기다리던 쪽에는 value(기본: 취소)로 알린다. */
export function closeSheet(value: unknown = null): void {
  layer?.remove();
  layer = null;
  const s = settle;
  settle = null;
  s?.(value);
}

function mount<T>(html: string, cancelValue: T, wire: (sheet: HTMLElement, done: (v: T) => void) => void): Promise<T> {
  closeSheet();
  return new Promise<T>((resolve) => {
    const el = document.createElement('div');
    el.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(el);
    layer = el;
    settle = resolve as Done;
    const sheet = el.querySelector<HTMLElement>('.sheet')!;
    el.querySelector('.scrim')!.addEventListener('click', () => closeSheet(cancelValue));
    sheet.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => closeSheet(cancelValue)));
    wire(sheet, (v) => closeSheet(v));
  });
}

export function openSheet(o: {
  title: string;
  items: { label: string; value: string; danger?: boolean; disabled?: boolean }[];
  cancelLabel?: string;
}): Promise<string | null> {
  const items = o.items
    .map((it) => `<button class="item${it.danger ? ' danger' : ''}" data-value="${esc(it.value)}"${it.disabled ? ' disabled' : ''}>${esc(it.label)}</button>`)
    .join('');
  const html = `<h2>${esc(o.title)}</h2>${items}<button class="item dim" data-cancel>${esc(o.cancelLabel ?? '취소')}</button>`;
  return mount<string | null>(html, null, (sheet, done) => {
    sheet.querySelectorAll<HTMLElement>('[data-value]').forEach((b) => b.addEventListener('click', () => done(b.dataset.value!)));
  });
}

export function confirmSheet(title: string, body: string, okLabel: string): Promise<boolean> {
  const html = `<h2>${esc(title)}</h2><p>${esc(body)}</p>
    <div class="row2"><button data-cancel>취소</button><button class="pri" data-ok>${esc(okLabel)}</button></div>`;
  return mount<boolean>(html, false, (sheet, done) => {
    sheet.querySelector('[data-ok]')!.addEventListener('click', () => done(true));
  });
}

/** 입력할 때마다 10줄/300자로 자르고 카운터를 `n / 10줄`로 보여준다. */
export function bindCommentLimit(ta: HTMLTextAreaElement, counter: HTMLElement): void {
  const update = () => {
    const v = clampComment(ta.value);
    if (v !== ta.value) ta.value = v;
    counter.textContent = `${commentLineCount(v)} / ${MAX_COMMENT_LINES}줄`;
  };
  ta.addEventListener('input', update);
  update();
}

export const COMMENT_PLACEHOLDER = '이 순간을 짧게 남겨요. 비워도 괜찮아요.';

export function editorSheet(initial: string): Promise<string | null> {
  const html = `<h2>멘트</h2>
    <textarea id="edTxt" rows="4" placeholder="${COMMENT_PLACEHOLDER}" aria-label="멘트">${esc(initial)}</textarea>
    <div class="counter"></div>
    <div class="row2"><button data-cancel>취소</button><button class="pri" data-ok>저장</button></div>`;
  return mount<string | null>(html, null, (sheet, done) => {
    const ta = sheet.querySelector<HTMLTextAreaElement>('textarea')!;
    bindCommentLimit(ta, sheet.querySelector<HTMLElement>('.counter')!);
    sheet.querySelector('[data-ok]')!.addEventListener('click', () => done(clampComment(ta.value.trim())));
    ta.focus();
  });
}
