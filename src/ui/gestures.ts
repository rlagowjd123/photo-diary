import { LONG_PRESS_MS } from '../config';
import { isSheetOpen } from './sheet';

/** 가로로 60px 넘게, 세로보다 확실히 많이 밀었을 때만 반응한다. */
export function onSwipe(el: HTMLElement, h: { left(): void; right(): void }): void {
  let x0: number | null = null;
  let y0 = 0;
  el.addEventListener('touchstart', (e) => {
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null || isSheetOpen()) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? h.left : h.right)();
  });
}

/** selector에 맞는 요소를 꾹 누르면 cb. 꾹 누른 뒤 따라오는 click은 막는다. */
export function onLongPress(root: HTMLElement, selector: string, cb: (el: HTMLElement) => void): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fired = false;
  let x = 0;
  let y = 0;
  const cancel = () => clearTimeout(timer);
  root.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(selector);
    if (!el) return;
    fired = false;
    x = e.clientX;
    y = e.clientY;
    cancel();
    timer = setTimeout(() => {
      fired = true;
      el.classList.add('pressed');
      setTimeout(() => el.classList.remove('pressed'), 200);
      cb(el);
    }, LONG_PRESS_MS);
  });
  // 손가락이 10px 넘게 움직였을 때만 취소한다 (가만히 누를 때의 작은 떨림은 무시).
  const movedFar = (cx: number, cy: number) => Math.hypot(cx - x, cy - y) > 10;
  root.addEventListener('pointermove', (e) => {
    if (movedFar(e.clientX, e.clientY)) cancel();
  });
  root.addEventListener('pointerup', cancel);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t || movedFar(t.clientX, t.clientY)) cancel();
  }, { passive: true });
  root.addEventListener('click', (e) => {
    if (fired && (e.target as HTMLElement).closest(selector)) {
      fired = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
  root.addEventListener('contextmenu', (e) => {
    if ((e.target as HTMLElement).closest(selector)) e.preventDefault();
  });
}
