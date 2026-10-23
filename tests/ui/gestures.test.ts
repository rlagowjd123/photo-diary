import { onLongPress } from '../../src/ui/gestures';

function touchMove(el: Element, x: number, y: number) {
  const e = new Event('touchmove', { bubbles: true });
  Object.defineProperty(e, 'touches', { value: [{ clientX: x, clientY: y }] });
  el.dispatchEvent(e);
}
function pointerDown(el: Element, x: number, y: number) {
  const e = new Event('pointerdown', { bubbles: true });
  Object.assign(e, { clientX: x, clientY: y });
  el.dispatchEvent(e);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const root = document.createElement('div');
  root.innerHTML = '<figure class="shot"><img></figure>';
  document.body.appendChild(root);
  const cb = vi.fn();
  onLongPress(root, '.shot', cb);
  return { target: root.querySelector('img')!, cb };
}

test('a steady hold with tiny finger jitter still opens the menu', () => {
  const { target, cb } = setup();
  pointerDown(target, 100, 100);
  touchMove(target, 102, 101);
  vi.advanceTimersByTime(500);
  expect(cb).toHaveBeenCalledTimes(1);
});

test('moving the finger far (scrolling) cancels', () => {
  const { target, cb } = setup();
  pointerDown(target, 100, 100);
  touchMove(target, 100, 140);
  vi.advanceTimersByTime(500);
  expect(cb).not.toHaveBeenCalled();
});
