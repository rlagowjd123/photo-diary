import { renderOnboarding, shouldShowOnboarding } from '../../src/views/onboarding';

test('onboarding only outside home-screen app and until dismissed', () => {
  expect(shouldShowOnboarding(false, false)).toBe(true);
  expect(shouldShowOnboarding(true, false)).toBe(false);
  expect(shouldShowOnboarding(false, true)).toBe(false);
});
test('onboarding copy', () => {
  const r = document.createElement('div');
  renderOnboarding(r);
  expect(r.textContent).toContain('홈 화면에 추가');
  expect(r.textContent).toContain('사진 일기');
  expect(r.textContent).toContain('이 폰의 홈 화면 앱과 Safari는 기록을 따로 보관해요.');
  expect(r.querySelector('[data-act="onboard-ok"]')!.textContent).toBe('알겠어요');
});
