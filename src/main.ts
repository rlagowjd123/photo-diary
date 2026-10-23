import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
import './styles.css';
import { App } from './app';
import { openStore } from './storage/db';

async function boot() {
  // 저장공간이 부족할 때 iOS가 기록을 지우지 않도록 요청한다.
  navigator.storage?.persist?.().catch(() => {});
  const store = await openStore();
  await new App(document.getElementById('app')!, store).start();
}

boot();
