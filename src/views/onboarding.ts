import { APP_NAME } from '../config';

const KEY = 'onboarding-dismissed';

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function shouldShowOnboarding(standalone: boolean, dismissed: boolean): boolean {
  return !standalone && !dismissed;
}

export function wasDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function dismiss(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* 저장 못 해도 이번에는 닫힌다 */
  }
}

export function renderOnboarding(root: HTMLElement): void {
  root.innerHTML = `
    <div class="lbl">${APP_NAME}</div>
    <h1>홈 화면에 추가해서 써주세요</h1>
    <ol>
      <li>1. 아래 공유 버튼을 눌러요</li>
      <li>2. '홈 화면에 추가'를 골라요</li>
      <li>3. 홈 화면의 ${APP_NAME} 아이콘으로 열어요</li>
    </ol>
    <p class="aside">이 폰의 홈 화면 앱과 Safari는 기록을 따로 보관해요.</p>
    <button class="btn-ink" data-act="onboard-ok">알겠어요</button>`;
}
