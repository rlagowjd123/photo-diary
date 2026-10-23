import { todayKey, type DayKey } from './core/date';
import { countRecordedDays } from './core/diary';
import type { DiaryStore } from './storage/db';
import { closeSheet } from './ui/sheet';
import { renderCover } from './views/cover';

type ViewName = 'cover' | 'cal' | 'day' | 'compose';
type Dir = 'slide-l' | 'slide-r';

export class App {
  readonly views = {} as Record<ViewName, HTMLElement>;
  calY = 0;
  calM = 0;
  dayKey: DayKey = '';

  constructor(readonly root: HTMLElement, readonly store: DiaryStore, readonly now: () => Date = () => new Date()) {
    for (const name of ['cover', 'cal', 'day', 'compose'] as ViewName[]) {
      const el = document.createElement('section');
      el.id = name;
      el.className = 'view';
      el.hidden = true;
      root.appendChild(el);
      this.views[name] = el;
    }
    root.addEventListener('click', (e) => this.onClick(e));
  }

  get today(): DayKey {
    return todayKey(this.now());
  }

  async start(): Promise<void> {
    await this.showCover();
  }

  protected show(name: ViewName): void {
    for (const [n, el] of Object.entries(this.views)) el.hidden = n !== name;
  }

  async showCover(): Promise<void> {
    const keys = await this.store.allDayKeys();
    renderCover(this.views.cover, { now: this.now(), recordedThisYear: countRecordedDays(keys, this.now().getFullYear()) });
    this.show('cover');
  }

  /** 표지를 종이처럼 넘기며 달력으로 간다. */
  async turnToCalendar(): Promise<void> {
    const cover = this.views.cover;
    if (cover.classList.contains('turn')) return;
    const n = this.now();
    await this.showCalendar(n.getFullYear(), n.getMonth(), undefined, true);
    cover.hidden = false;
    cover.classList.add('turn');
    const done = (ev: AnimationEvent) => {
      if (ev.target !== cover || ev.pseudoElement) return;
      cover.removeEventListener('animationend', done);
      cover.classList.remove('turn');
      cover.hidden = true;
    };
    cover.addEventListener('animationend', done);
  }

  async showCalendar(year: number, month0: number, _dir?: Dir, keepCover = false): Promise<void> {
    this.calY = year;
    this.calM = month0;
    this.views.cal.innerHTML = '';
    if (keepCover) this.views.cal.hidden = false;
    else this.show('cal');
  }

  async showDay(key: DayKey, _dir?: Dir): Promise<void> {
    this.dayKey = key;
    this.show('day');
  }

  async startAdd(_key: DayKey): Promise<void> {}

  protected async onClick(e: MouseEvent): Promise<void> {
    const t = e.target as HTMLElement;
    const a = t.closest<HTMLElement>('[data-act]');
    if (!a) {
      if (t.closest('#cover')) await this.turnToCalendar();
      return;
    }
    await this.act(a.dataset.act!, a);
  }

  protected async act(act: string, _el: HTMLElement): Promise<void> {
    switch (act) {
      case 'add-today':
        return this.startAdd(this.today);
      case 'to-cover':
        closeSheet();
        return this.showCover();
    }
  }
}
