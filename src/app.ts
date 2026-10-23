import { addDays, formatTime, oneYearAgo, parseDayKey, toDayKey, todayKey, type DayKey } from './core/date';
import { countRecordedDays, effectiveCoverId, needsBackupNudge } from './core/diary';
import { BackupError, buildBackup, readBackup, restoreBackup } from './backup/backup';
import { MAX_PHOTOS_PER_DAY } from './config';
import { readTakenAt, shrinkImage } from './media/image';
import { shareFile } from './media/share';
import type { DiaryStore, NewPhoto } from './storage/db';
import { onLongPress, onSwipe } from './ui/gestures';
import { closeSheet, confirmSheet, editorSheet, openSheet } from './ui/sheet';
import { toast } from './ui/toast';
import { forgetAllUrls, forgetUrl, photoUrl } from './ui/urls';
import { openViewer } from './ui/viewer';
import { readCompose, renderCompose } from './views/compose';
import { renderDay, type DayPhotoView } from './views/day';
import { restoreWarning, SETTINGS_NOTE, settingsInfo } from './views/settings';
import { renderCalendar } from './views/calendar';
import { renderCover } from './views/cover';
import { dismiss, isStandalone, renderOnboarding, shouldShowOnboarding, wasDismissed } from './views/onboarding';

type ViewName = 'cover' | 'cal' | 'day' | 'compose';
type Dir = 'slide-l' | 'slide-r';

export class App {
  readonly views = {} as Record<ViewName, HTMLElement>;
  calY = 0;
  calM = 0;
  dayKey: DayKey = '';
  addKey: DayKey = '';
  /** 화면을 그릴 때마다 증가. 늦게 끝난 이전 요청이 최신 화면을 덮지 못하게 한다. */
  private calSeq = 0;
  private daySeq = 0;
  readonly camInput: HTMLInputElement;
  readonly galInput: HTMLInputElement;
  readonly restoreInput: HTMLInputElement;

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
    onSwipe(this.views.cal, { left: () => this.moveMonth(1), right: () => this.moveMonth(-1) });
    onSwipe(this.views.day, { left: () => this.moveDay(1), right: () => this.moveDay(-1) });
    onLongPress(this.views.day, '.shot', (el) => this.photoMenu(el.dataset.id!));
    this.camInput = this.fileInput(true);
    this.galInput = this.fileInput(false);
    this.restoreInput = document.createElement('input');
    this.restoreInput.type = 'file';
    this.restoreInput.accept = '.zip,application/zip';
    this.restoreInput.hidden = true;
    this.restoreInput.addEventListener('change', () => {
      const f = this.restoreInput.files?.[0];
      this.restoreInput.value = '';
      if (f) this.restoreFrom(f);
    });
    root.appendChild(this.restoreInput);
  }

  private fileInput(camera: boolean): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    if (camera) input.setAttribute('capture', 'environment');
    else input.multiple = true;
    input.addEventListener('change', async () => {
      const files = [...(input.files ?? [])];
      input.value = '';
      if (!files.length) return;
      const ids = await this.addFiles(this.addKey, files, camera);
      if (ids.length) await this.showCompose(this.addKey, ids);
    });
    this.root.appendChild(input);
    return input;
  }

  get today(): DayKey {
    return todayKey(this.now());
  }

  async start(): Promise<void> {
    await this.showCover();
    if (shouldShowOnboarding(isStandalone(), wasDismissed())) {
      const el = document.createElement('section');
      el.id = 'onboarding';
      el.className = 'view';
      renderOnboarding(el);
      this.root.appendChild(el);
    }
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

  async showCalendar(year: number, month0: number, dir?: Dir, keepCover = false): Promise<void> {
    this.calY = year;
    this.calM = month0;
    const seq = ++this.calSeq;
    const from = toDayKey(new Date(year, month0, 1));
    const to = toDayKey(new Date(year, month0 + 1, 0));
    const covers: Record<DayKey, string> = {};
    for (const d of await this.store.getDaysBetween(from, to)) {
      const id = effectiveCoverId(d);
      if (id) covers[d.key] = await photoUrl(this.store, id);
    }
    const n = this.now();
    const meta = await this.store.getMeta();
    if (seq !== this.calSeq) return;
    renderCalendar(this.views.cal, {
      year, month0, today: this.today, covers, dir,
      showNudge: needsBackupNudge(meta, n.getTime()),
      canGoNext: year * 12 + month0 < n.getFullYear() * 12 + n.getMonth(),
    });
    if (keepCover) this.views.cal.hidden = false;
    else this.show('cal');
  }

  async moveMonth(step: -1 | 1): Promise<void> {
    const n = this.now();
    const t = new Date(this.calY, this.calM + step, 1);
    if (t.getFullYear() * 12 + t.getMonth() > n.getFullYear() * 12 + n.getMonth()) return;
    await this.showCalendar(t.getFullYear(), t.getMonth(), step > 0 ? 'slide-l' : 'slide-r');
  }

  async showDay(key: DayKey, dir?: Dir): Promise<void> {
    const keepScroll = !dir && key === this.dayKey && !this.views.day.hidden;
    const scroll = this.views.day.scrollTop;
    this.dayKey = key;
    const seq = ++this.daySeq;
    const day = await this.store.getDay(key);
    const coverId = day ? effectiveCoverId(day) : null;
    const photos: DayPhotoView[] = [];
    for (const id of day?.photoIds ?? []) {
      const p = await this.store.getPhoto(id);
      if (!p) continue;
      photos.push({ id, url: await photoUrl(this.store, id), comment: p.comment, time: formatTime(p.takenAt), isCover: id === coverId });
    }
    const yearAgo = await this.yearAgo(key);
    if (seq !== this.daySeq) return;
    renderDay(this.views.day, { key, today: this.today, photos, yearAgo, dir });
    this.show('day');
    this.views.day.scrollTop = keepScroll ? scroll : 0;
  }

  /** 작년 같은 날 기록: 대표사진 멘트 → 첫 멘트 → `사진 N장`. */
  private async yearAgo(key: DayKey) {
    const k = oneYearAgo(key);
    const day = await this.store.getDay(k);
    const coverId = day && effectiveCoverId(day);
    if (!day || !coverId) return null;
    const photos = await Promise.all(day.photoIds.map((id) => this.store.getPhoto(id)));
    const cover = photos.find((p) => p?.id === coverId);
    const text = cover?.comment || photos.find((p) => p?.comment)?.comment || `사진 ${day.photoIds.length}장`;
    return { key: k, url: await photoUrl(this.store, coverId), text };
  }

  async moveDay(step: -1 | 1): Promise<void> {
    const k = addDays(this.dayKey, step);
    if (k > this.today) return;
    await this.showDay(k, step > 0 ? 'slide-l' : 'slide-r');
  }

  private async photoMenu(id: string): Promise<void> {
    const p = await this.store.getPhoto(id);
    const day = p && (await this.store.getDay(p.dayKey));
    if (!p || !day) return;
    const i = day.photoIds.indexOf(id);
    const isCover = effectiveCoverId(day) === id;
    const blob = await this.store.getPhotoBlob(id);
    let sharing: Promise<unknown> | null = null;
    const choice = await openSheet({
      title: '사진',
      items: [
        { label: isCover ? '지금 대표사진이에요' : '대표사진으로 지정', value: 'cover', disabled: isCover },
        { label: '사진 앱에 저장', value: 'save' },
        { label: '위로 이동', value: 'up', disabled: i === 0 },
        { label: '아래로 이동', value: 'down', disabled: i === day.photoIds.length - 1 },
        { label: '삭제', value: 'delete', danger: true },
      ],
      cancelLabel: '닫기',
      // 공유 창은 누른 순간에 열어야 iOS가 막지 않는다.
      onPick: (v) => {
        if (v === 'save' && blob) sharing = shareFile(new File([blob], `${day.key}-${i + 1}.jpg`, { type: 'image/jpeg' }));
      },
    });
    switch (choice) {
      case 'cover':
        await this.store.setCover(day.key, id);
        toast('대표사진으로 지정했어요.');
        break;
      case 'save':
        try {
          await sharing;
        } catch {
          toast('저장하지 못했어요. 다시 시도해 주세요.');
        }
        return;
      case 'up':
      case 'down':
        await this.store.movePhoto(day.key, id, choice === 'up' ? -1 : 1);
        break;
      case 'delete':
        if (!(await confirmSheet('사진 삭제', '이 사진과 멘트를 지울까요? 지우면 되돌릴 수 없어요.', '삭제'))) return;
        await this.store.deletePhoto(id);
        forgetUrl(id);
        toast('지웠어요.');
        break;
      default:
        return;
    }
    await this.showDay(day.key);
  }

  async openSettings(): Promise<void> {
    const info = settingsInfo(await this.store.allDayKeys(), await this.store.getMeta());
    const choice = await openSheet({
      title: '설정',
      body: `마지막 백업: ${info.lastBackup}\n${SETTINGS_NOTE}`,
      items: [
        ...info.years.map((y) => ({ label: `${y}년 백업하기`, value: String(y) })),
        { label: '백업 불러오기', value: 'restore' },
      ],
      cancelLabel: '닫기',
      onPick: (v) => {
        if (v === 'restore') this.restoreInput.click();
      },
    });
    if (choice && choice !== 'restore') await this.backupYear(Number(choice));
  }

  private async backupYear(year: number): Promise<void> {
    toast('백업 파일을 만드는 중…');
    let file: File;
    try {
      file = await buildBackup(this.store, year);
    } catch {
      return toast('백업 파일을 만들지 못했어요. 다시 시도해 주세요.');
    }
    let sharing: Promise<'shared' | 'cancelled' | 'downloaded'> | null = null;
    const mb = (file.size / 1048576).toFixed(1);
    await openSheet({
      title: '백업 파일이 준비됐어요',
      body: `${file.name} · ${mb}MB\n공유 창에서 '파일에 저장'을 골라 iCloud Drive에 보관하세요.`,
      items: [{ label: '파일로 저장하기', value: 'share' }],
      onPick: () => {
        sharing = shareFile(file);
      },
    });
    if (!sharing) return;
    try {
      if ((await sharing) === 'cancelled') return;
    } catch {
      return toast('저장하지 못했어요. 다시 시도해 주세요.');
    }
    await this.store.markBackedUp(year);
    toast('백업했어요.');
    if (!this.views.cal.hidden) await this.showCalendar(this.calY, this.calM);
  }

  private async restoreFrom(file: File): Promise<void> {
    let data;
    try {
      data = await readBackup(file);
    } catch (e) {
      return toast(e instanceof BackupError ? e.message : '불러오지 못했어요.');
    }
    const warning = restoreWarning(data.year, data.days.map((d) => d.key), await this.store.allDayKeys());
    if (!(await confirmSheet('백업 불러오기', warning, '불러오기'))) return;
    try {
      await restoreBackup(this.store, data);
    } catch {
      return toast('불러오지 못했어요. 기존 기록은 그대로예요.');
    }
    forgetAllUrls();
    toast('불러왔어요.');
    await this.showCalendar(this.calY || this.now().getFullYear(), this.calY ? this.calM : this.now().getMonth());
  }

  private async editComment(id: string): Promise<void> {
    const p = await this.store.getPhoto(id);
    if (!p) return;
    const text = await editorSheet(p.comment);
    if (text === null) return;
    await this.store.updateComment(id, text);
    await this.showDay(this.dayKey);
  }

  async startAdd(key: DayKey): Promise<void> {
    if (key > this.today) return;
    const left = MAX_PHOTOS_PER_DAY - ((await this.store.getDay(key))?.photoIds.length ?? 0);
    if (left <= 0) return toast('하루에 사진은 5장까지예요.');
    this.addKey = key;
    const d = parseDayKey(key);
    await openSheet({
      title: `${d.getMonth() + 1}월 ${d.getDate()}일에 남기기 · ${left}장 더 가능`,
      items: [
        { label: '카메라로 찍기', value: 'cam' },
        { label: '갤러리에서 고르기', value: 'gal' },
      ],
      onPick: (v) => (v === 'cam' ? this.camInput : this.galInput).click(),
    });
  }

  /** 사진을 줄여서 바로 저장한다 (멘트보다 먼저). 저장된 사진 id를 돌려준다. */
  async addFiles(key: DayKey, files: File[], fromCamera: boolean): Promise<string[]> {
    const left = MAX_PHOTOS_PER_DAY - ((await this.store.getDay(key))?.photoIds.length ?? 0);
    const take = files.slice(0, Math.max(0, left));
    let dropped = files.length - take.length;
    let unreadable = 0;
    const items: NewPhoto[] = [];
    for (const f of take) {
      try {
        const { blob, width, height } = await shrinkImage(f);
        const takenAt = fromCamera ? Date.now() : await readTakenAt(f, f.lastModified || Date.now());
        items.push({ blob, width, height, takenAt });
      } catch {
        unreadable++;
      }
    }
    const { accepted, rejected } = items.length ? await this.store.addPhotos(key, items) : { accepted: [], rejected: 0 };
    dropped += rejected;
    if (dropped) toast(`${dropped}장은 하루 5장 제한으로 빠졌어요.`);
    else if (unreadable) toast('이 사진은 열 수 없어요.');
    return accepted.map((p) => p.id);
  }

  async showCompose(key: DayKey, ids: string[]): Promise<void> {
    this.dayKey = key;
    const photos = await Promise.all(ids.map(async (id) => ({ id, url: await photoUrl(this.store, id) })));
    renderCompose(this.views.compose, { key, photos });
    this.show('compose');
    this.views.compose.scrollTop = 0;
  }

  protected async onClick(e: MouseEvent): Promise<void> {
    const t = e.target as HTMLElement;
    const a = t.closest<HTMLElement>('[data-act]');
    if (!a) {
      const shot = t.closest<HTMLElement>('.shot');
      if (shot) openViewer(await photoUrl(this.store, shot.dataset.id!));
      else if (t.closest('#cover')) await this.turnToCalendar();
      return;
    }
    await this.act(a.dataset.act!, a);
  }

  protected async act(act: string, el: HTMLElement): Promise<void> {
    switch (act) {
      case 'open-day':
        return this.showDay(el.dataset.k!);
      case 'prev-m':
        return this.moveMonth(-1);
      case 'next-m':
        return this.moveMonth(1);
      case 'to-cal': {
        const d = parseDayKey(this.dayKey);
        return this.showCalendar(d.getFullYear(), d.getMonth());
      }
      case 'prev-d':
        return this.moveDay(-1);
      case 'next-d':
        return this.moveDay(1);
      case 'edit':
        return this.editComment(el.dataset.id!);
      case 'add-here':
        return this.startAdd(this.dayKey);
      case 'onboard-ok':
        dismiss();
        el.closest('#onboarding')?.remove();
        return;
      case 'settings':
        return this.openSettings();
      case 'comp-save': {
        for (const [id, text] of Object.entries(readCompose(this.views.compose))) {
          if (text) await this.store.updateComment(id, text);
        }
        await this.showDay(this.dayKey);
        return toast('저장했어요.');
      }
      case 'comp-later':
        await this.showDay(this.dayKey);
        return toast('사진만 저장했어요. 멘트는 눌러서 언제든 달 수 있어요.');
      case 'add-today':
        return this.startAdd(this.today);
      case 'to-cover':
        closeSheet();
        return this.showCover();
    }
  }
}
