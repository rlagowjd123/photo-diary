# 사진 일기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이폰 홈 화면에 추가해서 쓰는, 사진 중심의 개인 일기 웹앱(PWA)을 만든다.

**Architecture:** 프레임워크 없이 Vite + TypeScript로 만든다. 순수 로직(`src/core`)과 IndexedDB 저장소(`src/storage`), 이미지 처리(`src/media`), 백업(`src/backup`), 화면(`src/views`, `src/ui`)을 나눈다. 화면은 템플릿 문자열로 다시 그리고, 상태는 매번 저장소에서 읽는다. 서버는 없고, GitHub Pages에 정적 파일로 배포한다.

**Tech Stack:** Vite 6, TypeScript 5, Vitest 3 (+ happy-dom, fake-indexeddb), `idb`(IndexedDB), `fflate`(zip), `exifr`(촬영 시간), `vite-plugin-pwa`, `@fontsource/gowun-batang`

**Spec:** `docs/superpowers/specs/2026-10-23-photo-diary-design.md`
**시각 기준:** `docs/mockups/preview.html` (확정된 클릭 가능 시제품). 색 토큰, 글자 크기, 여백, 문구, 페이지 넘김 효과는 이 파일의 CSS와 문구를 그대로 옮긴다. 시제품의 예시 데이터와 가짜 사진 생성 코드는 옮기지 않는다.

## Global Constraints

- 아이폰 Safari 웹앱(홈 화면에 추가)이다. 서버, 로그인, 온라인 백업은 없다.
- 하루 사진은 최대 **5장**이다. 멘트는 사진마다 하나이고 **최대 10줄, 300자**다. 비워도 된다.
- 대표사진을 따로 정하지 않으면 **첫 번째 사진**이다. 대표사진이 지워지면 다시 첫 번째 사진이 된다.
- 사진은 긴 변 **1600px**, JPEG 품질 **0.82**로 줄여서 저장한다.
- 사진은 **`+`를 누른 날짜**에 들어간다. 시간 표시는 실제 촬영 시간(EXIF)이고, 없으면 카메라는 지금 시각, 갤러리는 `file.lastModified`를 쓴다.
- 날짜 키는 **기기 현지 시간 기준** `YYYY-MM-DD`이고, 자정에 바뀐다. 미래 날짜는 기록할 수 없다.
- 사진은 고르거나 찍는 순간 **먼저 저장**된다. 멘트는 그 뒤에 붙는다.
- 백업은 **연도별 zip**(`photo-diary-YYYY.zip`)이다. 불러오기는 그 연도의 기록을 백업 내용으로 **교체**한다(확인 후).
- 백업 알림: 어떤 연도에 백업 뒤 바뀐 기록이 있고, 그 첫 변경이 **14일** 넘게 지났으면 설정 옆에 점을 표시한다.
- 디자인: 미색 종이 단일 테마(다크모드 없음), Gowun Batang 글꼴은 앱에 포함한다. 튀는 요소 없이 조용하게 만든다.
- 앱 이름은 `src/config.ts`의 `APP_NAME = '사진 일기'` 한 곳에서만 정한다(임시 이름).
- 모든 화면 문구는 한국어이고 `docs/mockups/preview.html`의 문구를 따른다.

## Review Focus

1. **남은 자리보다 많이 고른 갤러리 사진** (예: 3장 있는 날에 4장 고름): 앞의 2장만 들어가고 "2장은 하루 5장 제한으로 빠졌어요." 안내가 나와야 한다. → Task 2, Task 3 테스트
2. **날짜 경계**: 밤 11시 59분과 0시 1분의 기록이 다른 날로 가야 한다. `toISOString()` 때문에 한국 시간이 UTC로 밀리면 안 된다. 2월 29일의 "1년 전 오늘"이 깨지면 안 된다. → Task 1 테스트
3. **붙여넣은 긴 멘트와 이모지**: 15줄 붙여넣기는 10줄로 잘리고, 300자 경계에서 이모지가 반으로 쪼개지면 안 된다. → Task 2 테스트
4. **대표사진 삭제 / 마지막 사진 삭제**: 대표가 지워지면 첫 사진이 대표가 되고, 마지막 사진을 지우면 그날 기록이 사라져 달력 칸이 비어야 한다. → Task 2, Task 3 테스트
5. **잘못된 백업 파일**: 다른 zip이나 깨진 파일을 불러오면 "이 파일은 사진 일기 백업이 아니에요."가 나오고, 기존 기록은 그대로 남아야 한다. → Task 9 테스트

---

## 파일 구조

```
photo-diary/
  index.html                  iOS 메타, 앱 루트
  vite.config.ts              base '/photo-diary/', PWA, vitest 설정
  public/icon.svg             아이콘 원본
  src/
    config.ts                 앱 이름, 각종 한계값
    main.ts                   부트: 글꼴/스타일 import, persist 요청, App 시작
    styles.css                토큰과 전체 스타일 (preview.html에서 옮김)
    core/date.ts              날짜 키, 달력 격자, 표시용 포맷
    core/diary.ts             Day/Photo 타입과 순수 규칙 (대표, 5장, 멘트 제한, 백업 알림)
    storage/db.ts             IndexedDB 저장소 (DiaryStore)
    media/image.ts            줄이기, 촬영 시간 읽기
    media/share.ts            공유 시트로 파일 내보내기
    backup/backup.ts          연도별 zip 만들기/읽기/복원
    ui/sheet.ts, toast.ts, gestures.ts, viewer.ts, urls.ts, esc.ts
    views/cover.ts, calendar.ts, day.ts, compose.ts, settings.ts, onboarding.ts
    app.ts                    화면 전환과 추가 흐름을 묶는 App
  tests/                      src와 같은 구조의 *.test.ts
  .github/workflows/deploy.yml
```

---

### Task 1: 프로젝트 뼈대와 날짜 유틸

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/config.ts`, `src/main.ts`, `src/styles.css`, `src/core/date.ts`
- Test: `tests/core/date.test.ts`

**Interfaces:**
- Produces:
  - `src/config.ts`: `APP_NAME = '사진 일기'`, `MAX_PHOTOS_PER_DAY = 5`, `MAX_COMMENT_LINES = 10`, `MAX_COMMENT_CHARS = 300`, `MAX_EDGE = 1600`, `JPEG_QUALITY = 0.82`, `BACKUP_NUDGE_DAYS = 14`, `LONG_PRESS_MS = 480`
  - `src/core/date.ts`:
    - `type DayKey = string` (`'YYYY-MM-DD'`)
    - `toDayKey(d: Date): DayKey` (현지 시간)
    - `parseDayKey(k: DayKey): Date` (현지 자정)
    - `todayKey(now?: Date): DayKey`
    - `addDays(k: DayKey, n: number): DayKey`
    - `isFuture(k: DayKey, today: DayKey): boolean`
    - `oneYearAgo(k: DayKey): DayKey` (2월 29일 → 전년 2월 28일)
    - `monthGrid(year: number, month0: number): (DayKey | null)[]` (일요일 시작, 앞쪽 빈칸은 null)
    - `dayHeading(k: DayKey): { label: string; title: string }` → `{ label: 'WED · 2026', title: '10월 7일' }`
    - `coverHeading(d: Date): { num: string; label: string }` → `{ num: '22', label: 'OCTOBER · THURSDAY' }`
    - `formatTime(ms: number): string` → `'14:32'`

- [ ] **Step 1: 뼈대 만들기**

`npm create vite@latest . -- --template vanilla-ts`로 만들고 템플릿 예제 파일을 지운다. 그리고 설치한다:
`npm i idb fflate exifr @fontsource/gowun-batang` / `npm i -D vitest happy-dom fake-indexeddb vite-plugin-pwa @vite-pwa/assets-generator`
`vite.config.ts`에는 `base: '/photo-diary/'`와 `test: { environment: 'happy-dom', setupFiles: ['fake-indexeddb/auto'] }`를 넣는다. `package.json` scripts에는 `"test": "vitest run"`을 넣는다.
`index.html`에는 `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=default`, `theme-color=#f5f1ea`, `<title>` = APP_NAME, `<div id="app"></div>`를 넣는다.
`src/styles.css`에는 `docs/mockups/preview.html`의 `<style>`을 옮긴다. 다만 `body`의 좌우 padding은 `env(safe-area-inset-*)`를 쓰고, 위아래는 `#app`에 `padding-top: env(safe-area-inset-top)`과 `padding-bottom: env(safe-area-inset-bottom)`을 준다. `src/main.ts`는 `@fontsource/gowun-batang/400.css`, `700.css`, `./styles.css`를 import한다.

- [ ] **Step 2: 실패하는 테스트 작성** `tests/core/date.test.ts`

```ts
import { toDayKey, addDays, isFuture, oneYearAgo, monthGrid, dayHeading, coverHeading, formatTime } from '../../src/core/date';

test('toDayKey uses local time, not UTC', () => {
  expect(toDayKey(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
  expect(toDayKey(new Date(2026, 9, 8, 0, 1))).toBe('2026-10-08');
});
test('addDays crosses month and year', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});
test('isFuture', () => {
  expect(isFuture('2026-10-24', '2026-10-23')).toBe(true);
  expect(isFuture('2026-10-23', '2026-10-23')).toBe(false);
});
test('oneYearAgo handles leap day', () => {
  expect(oneYearAgo('2026-10-07')).toBe('2025-10-07');
  expect(oneYearAgo('2028-02-29')).toBe('2027-02-28');
});
test('monthGrid: Oct 2026 starts Thursday', () => {
  const g = monthGrid(2026, 9);
  expect(g.slice(0, 4)).toEqual([null, null, null, null]);
  expect(g[4]).toBe('2026-10-01');
  expect(g.filter(Boolean)).toHaveLength(31);
});
test('headings and time', () => {
  expect(dayHeading('2026-10-07')).toEqual({ label: 'WED · 2026', title: '10월 7일' });
  expect(coverHeading(new Date(2026, 9, 22))).toEqual({ num: '22', label: 'OCTOBER · THURSDAY' });
  expect(formatTime(new Date(2026, 9, 7, 9, 5).getTime())).toBe('09:05');
});
```

- [ ] **Step 3: 실패 확인** — Run: `npx vitest run tests/core/date.test.ts` → Expected: FAIL (모듈 없음)

- [ ] **Step 4: `src/core/date.ts`와 `src/config.ts` 구현** — 모든 날짜 계산은 `new Date(y, m, d)`로 하고 `toISOString`은 쓰지 않는다.

- [ ] **Step 5: 통과 확인** — Run: `npx vitest run tests/core/date.test.ts` → PASS. Run: `npm run build` → 에러 없음

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: project scaffold and date utils"`

---

### Task 2: 일기 규칙 (순수 함수)

**Files:**
- Create: `src/core/diary.ts`
- Test: `tests/core/diary.test.ts`

**Interfaces:**
- Consumes: `DayKey`, config 상수 (Task 1)
- Produces:
  - `interface Photo { id: string; dayKey: DayKey; comment: string; takenAt: number; width: number; height: number }`
  - `interface Day { key: DayKey; photoIds: string[]; coverId: string | null }`
  - `effectiveCoverId(day: Day): string | null` — `coverId`가 `photoIds` 안에 있으면 그것, 아니면 `photoIds[0] ?? null`
  - `appendPhotoIds(day: Day | undefined, key: DayKey, ids: string[]): { day: Day; accepted: string[]; rejected: number }`
  - `movePhotoId(day: Day, id: string, dir: -1 | 1): Day` (끝에서는 그대로)
  - `removePhotoId(day: Day, id: string): Day | null` (비면 null, 대표가 지워지면 `coverId = null`)
  - `setCoverId(day: Day, id: string): Day`
  - `clampComment(text: string): string` — 10줄, 300자(코드 포인트 기준)
  - `commentLineCount(text: string): number` (빈 문자열은 0)
  - `countRecordedDays(keys: DayKey[], year: number): number`
  - `interface BackupMeta { lastBackupAt: Record<string, number>; pendingSince: Record<string, number> }` (키는 연도 문자열)
  - `emptyMeta(): BackupMeta`, `markChanged(m: BackupMeta, year: number, now: number): BackupMeta` (pendingSince가 없을 때만 now로 설정), `markBackedUp(m, year, now): BackupMeta` (lastBackupAt=now, pendingSince 삭제)
  - `needsBackupNudge(m: BackupMeta, now: number): boolean` — pendingSince 중 하나라도 `now - since >= 14일`이면 true

- [ ] **Step 1: 실패하는 테스트 작성** `tests/core/diary.test.ts`

```ts
const day = (ids: string[], coverId: string | null = null) => ({ key: '2026-10-07', photoIds: ids, coverId });

test('cover defaults to first, follows explicit choice', () => {
  expect(effectiveCoverId(day(['a', 'b']))).toBe('a');
  expect(effectiveCoverId(day(['a', 'b'], 'b'))).toBe('b');
  expect(effectiveCoverId(day(['a', 'b'], 'zz'))).toBe('a');
});
test('append respects 5 per day', () => {
  const r = appendPhotoIds(day(['a', 'b', 'c']), '2026-10-07', ['d', 'e', 'f', 'g']);
  expect(r.day.photoIds).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(r.accepted).toEqual(['d', 'e']);
  expect(r.rejected).toBe(2);
  expect(appendPhotoIds(undefined, '2026-10-08', ['x']).day).toEqual({ key: '2026-10-08', photoIds: ['x'], coverId: null });
});
test('remove cover falls back; remove last empties day', () => {
  const d = removePhotoId(day(['a', 'b'], 'b'), 'b')!;
  expect(d.coverId).toBeNull();
  expect(effectiveCoverId(d)).toBe('a');
  expect(removePhotoId(day(['a']), 'a')).toBeNull();
});
test('move up/down, no-op at edges', () => {
  expect(movePhotoId(day(['a', 'b', 'c']), 'c', -1).photoIds).toEqual(['a', 'c', 'b']);
  expect(movePhotoId(day(['a', 'b']), 'a', -1).photoIds).toEqual(['a', 'b']);
});
test('clampComment: lines, length, emoji-safe', () => {
  const fifteen = Array.from({ length: 15 }, (_, i) => `줄${i}`).join('\n');
  expect(commentLineCount(clampComment(fifteen))).toBe(10);
  expect([...clampComment('가'.repeat(400))]).toHaveLength(300);
  const emoji = '가'.repeat(299) + '😀😀';
  expect(clampComment(emoji)).toBe('가'.repeat(299) + '😀');
  expect(commentLineCount('')).toBe(0);
});
test('countRecordedDays counts only that year', () => {
  expect(countRecordedDays(['2026-01-01', '2026-10-07', '2025-10-07'], 2026)).toBe(2);
});
test('backup nudge after 14 days of unbacked changes', () => {
  const D = 86400000;
  let m = markChanged(emptyMeta(), 2026, 0);
  m = markChanged(m, 2026, 5 * D); // 처음 변경 시각을 유지
  expect(needsBackupNudge(m, 13 * D)).toBe(false);
  expect(needsBackupNudge(m, 14 * D)).toBe(true);
  expect(needsBackupNudge(markBackedUp(m, 2026, 14 * D), 30 * D)).toBe(false);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/core/diary.test.ts` → FAIL
- [ ] **Step 3: `src/core/diary.ts` 구현** — 모든 함수는 입력을 바꾸지 않고 새 객체를 돌려준다. `clampComment`은 `split('\n')`으로 10줄을 자른 뒤 `Array.from`으로 300 코드 포인트를 자른다.
- [ ] **Step 4: 통과 확인** — Run: `npx vitest run tests/core/diary.test.ts` → PASS
- [ ] **Step 5: Commit** — `git commit -am "feat: diary rules"` (새 파일은 `git add` 후)

---

### Task 3: IndexedDB 저장소

**Files:**
- Create: `src/storage/db.ts`
- Test: `tests/storage/db.test.ts`

**Interfaces:**
- Consumes: `Day`, `Photo`, `BackupMeta`, Task 2의 순수 함수들
- Produces:
  - `interface NewPhoto { blob: Blob; takenAt: number; width: number; height: number }`
  - `openStore(dbName = 'photo-diary'): Promise<DiaryStore>`
  - `interface DiaryStore {`
    - `getDay(key: DayKey): Promise<Day | undefined>`
    - `getDaysBetween(from: DayKey, to: DayKey): Promise<Day[]>` (양 끝 포함)
    - `allDayKeys(): Promise<DayKey[]>`
    - `getPhoto(id: string): Promise<Photo | undefined>`
    - `getPhotoBlob(id: string): Promise<Blob | undefined>`
    - `addPhotos(key: DayKey, items: NewPhoto[], now?: number): Promise<{ accepted: Photo[]; rejected: number }>` — 사진과 Day를 한 트랜잭션으로 쓰고 `markChanged`
    - `updateComment(id: string, text: string): Promise<void>` (`clampComment` 적용)
    - `setCover(key: DayKey, id: string): Promise<void>`
    - `movePhoto(key: DayKey, id: string, dir: -1 | 1): Promise<void>`
    - `deletePhoto(id: string): Promise<void>` (Day가 비면 Day 레코드 삭제)
    - `getMeta(): Promise<BackupMeta>`, `markBackedUp(year: number, now?: number): Promise<void>`
    - `exportYear(year: number): Promise<{ days: Day[]; photos: Array<Photo & { blob: Blob }> }>`
    - `replaceYear(year: number, days: Day[], photos: Array<Photo & { blob: Blob }>): Promise<void>` — 그 연도의 기존 Day/사진을 지우고 새로 쓴다. 한 트랜잭션으로 한다.
  - `}`
  - 스토어: `days`(keyPath `key`), `photos`(keyPath `id`, index `dayKey`; 값에 `blob` 포함), `meta`(키 `'backup'`). 변경할 때마다 `markChanged`로 그 연도를 기록한다. id는 `crypto.randomUUID()`로 만든다.

- [ ] **Step 1: 실패하는 테스트 작성** `tests/storage/db.test.ts` — 테스트마다 `openStore('t-' + crypto.randomUUID())`로 새 DB를 연다.

```ts
const p = (t = 0): NewPhoto => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), takenAt: t, width: 10, height: 10 });

test('addPhotos persists immediately and caps at 5', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  await s.addPhotos('2026-10-07', [p(), p(), p()]);
  const r = await s.addPhotos('2026-10-07', [p(), p(), p(), p()]);
  expect(r.accepted).toHaveLength(2);
  expect(r.rejected).toBe(2);
  expect((await s.getDay('2026-10-07'))!.photoIds).toHaveLength(5);
  expect(await s.getPhotoBlob(r.accepted[0].id)).toBeInstanceOf(Blob);
});
test('comment is clamped and saved', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  const { accepted: [ph] } = await s.addPhotos('2026-10-07', [p()]);
  await s.updateComment(ph.id, Array(12).fill('a').join('\n'));
  expect((await s.getPhoto(ph.id))!.comment.split('\n')).toHaveLength(10);
});
test('deleting last photo removes the day', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  const { accepted: [ph] } = await s.addPhotos('2026-10-07', [p()]);
  await s.deletePhoto(ph.id);
  expect(await s.getDay('2026-10-07')).toBeUndefined();
  expect(await s.allDayKeys()).toEqual([]);
});
test('setCover / movePhoto / getDaysBetween', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  const { accepted } = await s.addPhotos('2026-10-07', [p(), p()]);
  await s.setCover('2026-10-07', accepted[1].id);
  await s.movePhoto('2026-10-07', accepted[1].id, -1);
  const d = (await s.getDay('2026-10-07'))!;
  expect(d.coverId).toBe(accepted[1].id);
  expect(d.photoIds[0]).toBe(accepted[1].id);
  await s.addPhotos('2026-11-01', [p()]);
  expect((await s.getDaysBetween('2026-10-01', '2026-10-31')).map(x => x.key)).toEqual(['2026-10-07']);
});
test('replaceYear swaps only that year', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  await s.addPhotos('2025-05-05', [p()]);
  await s.addPhotos('2026-10-07', [p()]);
  await s.replaceYear(2026, [], []);
  expect(await s.allDayKeys()).toEqual(['2025-05-05']);
});
test('changes mark meta pending', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  await s.addPhotos('2026-10-07', [p()], 1000);
  expect((await s.getMeta()).pendingSince['2026']).toBe(1000);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/storage` → FAIL
- [ ] **Step 3: `src/storage/db.ts` 구현** (`idb`의 `openDB` 사용, 버전 1에서 스토어 3개 생성)
- [ ] **Step 4: 통과 확인** — Run: `npx vitest run tests/storage` → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: indexeddb store"`

---

### Task 4: 사진 줄이기, 촬영 시간, 공유

**Files:**
- Create: `src/media/image.ts`, `src/media/share.ts`
- Test: `tests/media/image.test.ts`

**Interfaces:**
- Produces:
  - `fitWithin(w: number, h: number, max: number): { width: number; height: number }` (키우지 않음, 반올림)
  - `shrinkImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }>` — `createImageBitmap(file, { imageOrientation: 'from-image' })`로 열고, 실패하면 `<img>` + objectURL로 다시 시도한다. canvas `toBlob('image/jpeg', JPEG_QUALITY)`로 저장한다. 열 수 없으면 `ImageError`를 던진다.
  - `readTakenAt(file: File, fallback: number): Promise<number>` — `exifr.parse(file, ['DateTimeOriginal'])`. 실패하거나 값이 없으면 `fallback`을 돌려준다.
  - `shareFile(file: File): Promise<'shared' | 'cancelled' | 'downloaded'>` — `navigator.canShare?.({ files: [file] })`이면 `navigator.share`를 쓰고, AbortError면 `'cancelled'`다. 공유를 못 쓰면 `<a download>`로 내려받는다(데스크톱 확인용).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('fitWithin', () => {
  expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  expect(fitWithin(12000, 2000, 1600)).toEqual({ width: 1600, height: 267 }); // 파노라마
  expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
});
test('readTakenAt falls back when no EXIF', async () => {
  const f = new File(['not an image'], 'a.jpg', { type: 'image/jpeg' });
  expect(await readTakenAt(f, 123)).toBe(123);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/media` → FAIL
- [ ] **Step 3: 구현** (`shrinkImage`와 `shareFile`은 브라우저 전용이라 Task 11에서 실기기로 확인한다)
- [ ] **Step 4: 통과 확인** — Run: `npx vitest run tests/media` → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: image shrink, capture time, share"`

---

### Task 5: 앱 틀, 공용 UI, 표지 화면과 종이 넘김

**Files:**
- Create: `src/app.ts`, `src/ui/esc.ts`, `src/ui/sheet.ts`, `src/ui/toast.ts`, `src/ui/gestures.ts`, `src/ui/viewer.ts`, `src/ui/urls.ts`, `src/views/cover.ts`
- Modify: `src/main.ts`
- Test: `tests/views/cover.test.ts`, `tests/ui/sheet.test.ts`

**Interfaces:**
- Consumes: `DiaryStore`(Task 3), `coverHeading`, `countRecordedDays`
- Produces:
  - `esc(s: string): string`
  - `openSheet(o: { title: string; items: { label: string; value: string; danger?: boolean; disabled?: boolean }[]; cancelLabel?: string }): Promise<string | null>`
  - `confirmSheet(title: string, body: string, okLabel: string): Promise<boolean>`
  - `bindCommentLimit(ta: HTMLTextAreaElement, counter: HTMLElement): void` (입력할 때마다 `clampComment`을 적용하고, 카운터를 `n / 10줄`로 바꾼다. Task 8에서도 쓴다)
  - `editorSheet(initial: string): Promise<string | null>` (textarea + `bindCommentLimit`)
  - `closeSheet(): void`, `isSheetOpen(): boolean`
  - `toast(msg: string): void` (2.2초)
  - `onSwipe(el: HTMLElement, h: { left(): void; right(): void }): void` (가로 60px 이상, |dx| > 1.5|dy|, 시트가 열려 있으면 무시)
  - `onLongPress(root: HTMLElement, selector: string, cb: (el: HTMLElement) => void): void` (LONG_PRESS_MS, 10px 넘게 움직이면 취소; 길게 누른 직후의 click은 막는다; contextmenu 막기)
  - `openViewer(url: string): void`
  - `photoUrl(store: DiaryStore, id: string): Promise<string>` (objectURL 캐시), `forgetUrl(id: string): void`
  - `renderCover(root: HTMLElement, v: { now: Date; recordedThisYear: number }): void` — 문구: 기록이 있으면 `올해 ${n}일을 남겼어요.`, 0이면 `오늘 첫 페이지를 남겨보세요.` 작은 `+`에는 `data-act="add-today"`가 붙고, `TOUCH TO OPEN`이 있다.
  - `class App { constructor(root: HTMLElement, store: DiaryStore, now?: () => Date); start(): Promise<void>; showCover(); showCalendar(year: number, month0: number, dir?: 'slide-l' | 'slide-r'); showDay(key: DayKey, dir?); startAdd(key: DayKey) }` — 이 Task에서는 `showCover`, 종이 넘김으로 `showCalendar`로 가는 전환(달력 내용은 Task 6에서 채움), `startAdd`의 자리만 만든다.
  - 화면 4개(`#cover`, `#cal`, `#day`, `#compose`)는 `.view`로 겹쳐 두고 `hidden`으로 바꾼다. 페이지 넘김 CSS(`.turn`, `@keyframes turn/shade`, reduced-motion 대체)는 preview.html의 것을 그대로 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('cover shows date, count and quiet plus', () => {
  const root = document.createElement('div');
  renderCover(root, { now: new Date(2026, 9, 22), recordedThisYear: 42 });
  expect(root.textContent).toContain('22');
  expect(root.textContent).toContain('OCTOBER · THURSDAY');
  expect(root.textContent).toContain('올해 42일을 남겼어요.');
  expect(root.querySelector('[data-act="add-today"]')).not.toBeNull();
  renderCover(root, { now: new Date(2026, 9, 22), recordedThisYear: 0 });
  expect(root.textContent).toContain('오늘 첫 페이지를 남겨보세요.');
});
test('openSheet resolves with chosen value, null on cancel', async () => {
  const p = openSheet({ title: 't', items: [{ label: '카메라로 찍기', value: 'cam' }] });
  (document.querySelector('[data-value="cam"]') as HTMLElement).click();
  expect(await p).toBe('cam');
  const q = openSheet({ title: 't', items: [] });
  (document.querySelector('[data-cancel]') as HTMLElement).click();
  expect(await q).toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/views/cover.test.ts tests/ui` → FAIL
- [ ] **Step 3: 구현** — `main.ts`: `navigator.storage?.persist?.()`를 요청하고, `openStore()`를 연 뒤 `new App(document.getElementById('app')!, store).start()`를 부른다.
- [ ] **Step 4: 통과 확인** → PASS. `npm run dev`로 열어서 표지를 누르면 종이 넘김 효과가 나오는지 눈으로 확인한다.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: app shell, shared ui, cover with page turn"`

---

### Task 6: 달력 화면

**Files:**
- Create: `src/views/calendar.ts`
- Modify: `src/app.ts` (`showCalendar`)
- Test: `tests/views/calendar.test.ts`

**Interfaces:**
- Consumes: `monthGrid`, `effectiveCoverId`, `needsBackupNudge`, `photoUrl`, `onSwipe`
- Produces:
  - `renderCalendar(root: HTMLElement, v: { year: number; month0: number; today: DayKey; covers: Record<DayKey, string>; showNudge: boolean; canGoNext: boolean; dir?: string }): void`
    - `covers`: 날짜 키 → 대표사진 URL
    - 칸은 `button.cell[data-k]`이다. 기록이 있으면 `.has`와 `<img>`, 오늘이면 `.today`, 미래면 `.future`와 `disabled`를 붙인다.
    - 연도 라벨에는 `data-act="to-cover"`, 설정에는 `data-act="settings"`를 붙이고, `showNudge`면 `.dot`을 넣는다. 화살표는 `data-act="prev-m"/"next-m"`이고, `canGoNext`가 false면 다음 화살표를 disabled로 둔다. 작은 `+`는 `data-act="add-today"`다.
  - App: 다음달 이동은 이번 달까지만 된다. 좌우로 밀면 달이 넘어간다. 날짜를 누르면 `showDay`로 간다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('calendar fills recorded days, marks today, blocks future', () => {
  const root = document.createElement('div');
  renderCalendar(root, { year: 2026, month0: 9, today: '2026-10-23',
    covers: { '2026-10-07': 'blob:a' }, showNudge: true, canGoNext: false });
  const c7 = root.querySelector('[data-k="2026-10-07"]')!;
  expect(c7.classList.contains('has')).toBe(true);
  expect(c7.querySelector('img')!.getAttribute('src')).toBe('blob:a');
  expect(root.querySelector('[data-k="2026-10-23"]')!.classList.contains('today')).toBe(true);
  expect((root.querySelector('[data-k="2026-10-24"]') as HTMLButtonElement).disabled).toBe(true);
  expect(root.querySelector('.dot')).not.toBeNull();
  expect((root.querySelector('[data-act="next-m"]') as HTMLButtonElement).disabled).toBe(true);
  expect(root.textContent).toContain('10월');
});
```

- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: calendar view"`

---

### Task 7: 하루 화면 (피드, 꾹 누르기 메뉴, 멘트 수정, 전날/다음날, 1년 전 오늘)

**Files:**
- Create: `src/views/day.ts`
- Modify: `src/app.ts` (`showDay`, 메뉴 동작)
- Test: `tests/views/day.test.ts`

**Interfaces:**
- Consumes: `dayHeading`, `formatTime`, `oneYearAgo`, `effectiveCoverId`, store 메서드, `openSheet`, `confirmSheet`, `editorSheet`, `onLongPress`, `onSwipe`, `openViewer`, `shareFile`
- Produces:
  - `interface DayPhotoView { id: string; url: string; comment: string; time: string; isCover: boolean }`
  - `renderDay(root: HTMLElement, v: { key: DayKey; today: DayKey; photos: DayPhotoView[]; yearAgo: { key: DayKey; url: string; text: string } | null; dir?: string }): void`
    - 사진이 없으면 `button.empty-add[data-act="add-here"]`(`이날의 첫 사진`)를 보여준다.
    - 사진마다 `figure.shot[data-id]`를 두고, 대표사진이면 `.badge`(`대표`)를 붙인다. `time`과 멘트 `p.cm[data-act="edit"]`를 넣고, 빈 멘트는 `.empty`(`멘트 달기`)로 보여준다.
    - 사진이 1~4장이면 `.fab-wrap` 안에 `+`(`data-act="add-here"`)를 둔다.
    - `yearAgo`가 있으면 `.yago[data-act="open-day"][data-k]`에 `1년 전 오늘`을 보여준다. `text`는 대표사진 멘트, 없으면 첫 멘트, 그것도 없으면 `사진 N장`이다.
    - 다음날 화살표는 `key >= today`면 disabled다.
  - App 동작: 사진을 꾹 누르면 `openSheet`로 `대표사진으로 지정`(대표면 disabled, 문구는 `지금 대표사진이에요`) / `사진 앱에 저장` / `위로 이동` / `아래로 이동` / `삭제`(danger) 메뉴를 띄운다. 삭제는 `confirmSheet('사진 삭제', '이 사진과 멘트를 지울까요? 지우면 되돌릴 수 없어요.', '삭제')`로 확인한다. 사진 앱에 저장은 `shareFile(new File([blob], `${key}-${n}.jpg`))`이다. 사진을 그냥 누르면 `openViewer`, 멘트를 누르면 `editorSheet` → `updateComment`다. 좌우로 밀면 전날/다음날로 가고, 미래로는 가지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
const ph = (id: string, isCover = false, comment = ''): DayPhotoView => ({ id, url: 'blob:' + id, comment, time: '14:32', isCover });

test('empty day shows big plus', () => {
  const r = document.createElement('div');
  renderDay(r, { key: '2026-10-07', today: '2026-10-23', photos: [], yearAgo: null });
  expect(r.querySelector('.empty-add')!.textContent).toContain('이날의 첫 사진');
  expect(r.querySelector('.fab-wrap')).toBeNull();
});
test('feed renders cover badge, times, comments, empty comment prompt', () => {
  const r = document.createElement('div');
  renderDay(r, { key: '2026-10-07', today: '2026-10-23',
    photos: [ph('a', false, '친구들과 집 앞 카페에서.'), ph('b', true)], yearAgo: null });
  expect(r.querySelectorAll('.shot')).toHaveLength(2);
  expect(r.querySelector('[data-id="b"] .badge')!.textContent).toBe('대표');
  expect(r.textContent).toContain('친구들과 집 앞 카페에서.');
  expect(r.querySelector('[data-id="b"] .cm.empty')!.textContent).toBe('멘트 달기');
  expect(r.querySelector('.fab-wrap')).not.toBeNull();
  expect(r.textContent).toContain('10월 7일');
});
test('five photos hide plus; yearAgo shows; comments are escaped', () => {
  const r = document.createElement('div');
  renderDay(r, { key: '2026-10-23', today: '2026-10-23',
    photos: ['a', 'b', 'c', 'd', 'e'].map(i => ph(i, i === 'a', '<b>x</b>')),
    yearAgo: { key: '2025-10-23', url: 'blob:y', text: '첫 출근 기념 커피.' } });
  expect(r.querySelector('.fab-wrap')).toBeNull();
  expect(r.querySelector('.yago')!.textContent).toContain('1년 전 오늘');
  expect(r.querySelector('.cm b')).toBeNull();
  expect((r.querySelector('[data-act="next-d"]') as HTMLButtonElement).disabled).toBe(true);
});
```

- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: day view with menu, editing, day swipe, year-ago"`

---

### Task 8: 사진 추가 흐름과 멘트 쓰기 (사진 먼저 저장)

**Files:**
- Create: `src/views/compose.ts`
- Modify: `src/app.ts` (`startAdd`, 파일 입력 처리)
- Test: `tests/views/compose.test.ts`, `tests/app/add-flow.test.ts`

**Interfaces:**
- Consumes: `shrinkImage`, `readTakenAt`, `store.addPhotos`, `store.updateComment`, `openSheet`, `toast`, `bindCommentLimit` (Task 5)
- Produces:
  - `renderCompose(root: HTMLElement, v: { key: DayKey; photos: { id: string; url: string }[] }): void` — 사진마다 `textarea#c_<id>`와 카운터를 둔다. 위쪽에는 `나중에 쓰기`(`data-act="comp-later"`)와 `사진은 이미 저장됐어요`, 아래에는 `저장` 버튼(`data-act="comp-save"`)이 있다.
  - `readCompose(root: HTMLElement): Record<string, string>` (id → 잘린 멘트, 앞뒤 공백 제거)
  - `App.addFiles(key: DayKey, files: File[], fromCamera: boolean): Promise<string[]>` — 각 파일을 `shrinkImage`로 줄인다. 촬영 시간은 카메라면 `Date.now()`, 갤러리면 `readTakenAt(f, f.lastModified || Date.now())`를 쓴다. 그다음 `store.addPhotos`로 **바로 저장**한다. 넘친 장수는 `toast(`${n}장은 하루 5장 제한으로 빠졌어요.`)`로, 열 수 없는 사진은 `toast('이 사진은 열 수 없어요.')`로 알리고 건너뛴다. 저장된 id 목록을 돌려준다. 사진을 줄이기 전에 남은 자리 수만큼만 처리한다.
  - `App.startAdd(key)`: 남은 자리가 0이면 `toast('하루에 사진은 5장까지예요.')`를 띄운다. 아니면 시트(`M월 D일에 남기기 · N장 더 가능`, `카메라로 찍기` / `갤러리에서 고르기`)를 띄운다. 숨겨진 `<input type=file accept="image/*" capture="environment">`와 `<input type=file accept="image/*" multiple>`을 쓴다. 저장된 사진이 있으면 멘트 쓰기 화면을 연다. `저장`을 누르면 멘트를 붙이고 하루 화면으로 가서 `저장했어요.`를 띄운다. `나중에 쓰기`를 누르면 하루 화면으로 가서 `사진만 저장했어요. 멘트는 눌러서 언제든 달 수 있어요.`를 띄운다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// tests/views/compose.test.ts
test('compose reads clamped, trimmed comments per photo', () => {
  const r = document.createElement('div');
  renderCompose(r, { key: '2026-10-07', photos: [{ id: 'a', url: 'blob:a' }, { id: 'b', url: 'blob:b' }] });
  (r.querySelector('#c_a') as HTMLTextAreaElement).value = '  친구 수진이와  ';
  (r.querySelector('#c_b') as HTMLTextAreaElement).value = Array(12).fill('x').join('\n');
  const out = readCompose(r);
  expect(out.a).toBe('친구 수진이와');
  expect(out.b.split('\n')).toHaveLength(10);
  expect(r.textContent).toContain('사진은 이미 저장됐어요');
});

// tests/app/add-flow.test.ts — shrinkImage, readTakenAt을 vi.mock으로 대체
vi.mock('../../src/media/image', () => ({
  shrinkImage: vi.fn(async () => ({ blob: new Blob(['j']), width: 10, height: 10 })),
  readTakenAt: vi.fn(async (_f, fb) => fb),
}));
test('photos are stored before any comment is written, overflow reported', async () => {
  const store = await openStore('t-' + crypto.randomUUID());
  await store.addPhotos('2026-10-07', Array(3).fill(0).map(() => ({ blob: new Blob(['x']), takenAt: 0, width: 1, height: 1 })));
  const app = new App(document.createElement('div'), store, () => new Date(2026, 9, 23));
  const files = Array(4).fill(0).map((_, i) => new File(['x'], `${i}.jpg`, { type: 'image/jpeg' }));
  const ids = await app.addFiles('2026-10-07', files, false);
  expect(ids).toHaveLength(2);
  expect((await store.getDay('2026-10-07'))!.photoIds).toHaveLength(5); // compose를 열기 전에 이미 저장됨
  expect(document.body.textContent).toContain('2장은 하루 5장 제한으로 빠졌어요.');
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/views/compose.test.ts tests/app` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add flow with photo-first save and compose"`

---

### Task 9: 백업 / 불러오기와 설정 화면

**Files:**
- Create: `src/backup/backup.ts`, `src/views/settings.ts`
- Modify: `src/app.ts` (설정 열기, 점 표시 갱신)
- Test: `tests/backup/backup.test.ts`

**Interfaces:**
- Consumes: `store.exportYear`, `store.replaceYear`, `store.markBackedUp`, `store.getMeta`, `shareFile`, `confirmSheet`
- Produces:
  - zip 구성: `diary.json` = `{ app: 'photo-diary', version: 1, year: number, days: Day[], photos: Photo[] }`, `photos/<id>.jpg`
  - `buildBackup(store: DiaryStore, year: number): Promise<File>` — 파일명 `photo-diary-${year}.zip`, `fflate.zip`으로 만든다(사진은 이미 JPEG라 `level: 0`).
  - `class BackupError extends Error` — 메시지 `이 파일은 사진 일기 백업이 아니에요.`
  - `readBackup(file: Blob): Promise<{ year: number; days: Day[]; photos: Array<Photo & { blob: Blob }> }>` — unzip이 실패하거나, `app`/`version`이 다르거나, 사진 파일이 빠졌으면 `BackupError`를 던진다.
  - `restoreBackup(store: DiaryStore, data): Promise<void>` → `store.replaceYear(data.year, ...)` 후 `markBackedUp(data.year)`
  - 설정 시트: `마지막 백업: ${날짜 | '아직 없어요'}`, 안내 문구(preview.html과 같음)를 보여준다. 기록이 있는 연도마다 `${year}년 백업하기` 버튼(최근 연도 먼저)과 `백업 불러오기` 버튼이 있다. 백업 공유가 끝나면(`'shared'` 또는 `'downloaded'`) `markBackedUp`을 하고, `'cancelled'`면 아무것도 안 한다. 불러오기 전에는 `confirmSheet('백업 불러오기', `${year}년 기록을 이 백업 내용으로 바꿔요.`, '불러오기')`로 확인한다. 불러오기를 마치면 `불러왔어요.`를 띄우고 달력을 다시 그린다. 버튼을 누르는 동안에는 `백업 파일을 만드는 중…` 상태를 보여준다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('backup round-trip restores a year exactly', async () => {
  const a = await openStore('t-' + crypto.randomUUID());
  const { accepted } = await a.addPhotos('2026-10-07', [{ blob: new Blob(['jpg1']), takenAt: 5, width: 2, height: 3 }]);
  await a.updateComment(accepted[0].id, '친구 수진이와');
  const file = await buildBackup(a, 2026);
  expect(file.name).toBe('photo-diary-2026.zip');

  const b = await openStore('t-' + crypto.randomUUID());
  await b.addPhotos('2026-01-01', [{ blob: new Blob(['old']), takenAt: 0, width: 1, height: 1 }]);
  await restoreBackup(b, await readBackup(file));
  expect(await b.allDayKeys()).toEqual(['2026-10-07']);
  expect((await b.getPhoto(accepted[0].id))!.comment).toBe('친구 수진이와');
  expect(await (await b.getPhotoBlob(accepted[0].id))!.text()).toBe('jpg1');
});
test('foreign or broken files are rejected and nothing changes', async () => {
  const s = await openStore('t-' + crypto.randomUUID());
  await s.addPhotos('2026-10-07', [{ blob: new Blob(['x']), takenAt: 0, width: 1, height: 1 }]);
  await expect(readBackup(new Blob(['garbage']))).rejects.toThrow('이 파일은 사진 일기 백업이 아니에요.');
  const other = new Blob([zipSync({ 'diary.json': strToU8('{"app":"other"}') })]);
  await expect(readBackup(other)).rejects.toBeInstanceOf(BackupError);
  expect(await s.allDayKeys()).toEqual(['2026-10-07']);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/backup` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: yearly backup and restore, settings"`

---

### Task 10: PWA 마감 (홈 화면 앱, 오프라인, 아이콘, 첫 실행 안내)

**Files:**
- Create: `public/icon.svg`, `src/views/onboarding.ts`
- Modify: `vite.config.ts`, `index.html`, `src/app.ts`
- Test: `tests/views/onboarding.test.ts`

**Interfaces:**
- Produces:
  - `isStandalone(): boolean` — `matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true`
  - `shouldShowOnboarding(standalone: boolean, dismissed: boolean): boolean` → `!standalone && !dismissed`
  - `renderOnboarding(root: HTMLElement): void` — 종이 느낌의 한 장 안내: `홈 화면에 추가해서 써주세요`, 단계 `1. 아래 공유 버튼을 눌러요`, `2. '홈 화면에 추가'를 골라요`, `3. 홈 화면의 ${APP_NAME} 아이콘으로 열어요`, 그리고 `이 폰의 홈 화면 앱과 Safari는 기록을 따로 보관해요.` 한 줄, 버튼 `알겠어요`(dismissed를 localStorage에 저장하고, try/catch로 감싼다)
  - PWA 설정: `VitePWA({ registerType: 'autoUpdate', manifest: { name: APP_NAME, short_name: APP_NAME, display: 'standalone', background_color: '#f5f1ea', theme_color: '#f5f1ea', start_url: '/photo-diary/', scope: '/photo-diary/', icons: [...] }, workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'] } })`
  - 아이콘: `icon.svg`는 미색 바탕(`#f5f1ea`)에 먹색 얇은 필름 프레임과 작은 숫자 `7`을 넣는다. `npx pwa-assets-generator --preset minimal-2023 public/icon.svg`로 `apple-touch-icon-180x180.png`, 192, 512를 만들고 `index.html`에 `<link rel="apple-touch-icon">`을 넣는다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('onboarding only outside home-screen app and until dismissed', () => {
  expect(shouldShowOnboarding(false, false)).toBe(true);
  expect(shouldShowOnboarding(true, false)).toBe(false);
  expect(shouldShowOnboarding(false, true)).toBe(false);
});
test('onboarding copy', () => {
  const r = document.createElement('div');
  renderOnboarding(r);
  expect(r.textContent).toContain('홈 화면에 추가');
  expect(r.textContent).toContain('알겠어요');
});
```

- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** — `App.start()`에서 `shouldShowOnboarding`이 참이면 표지 위에 안내를 먼저 보여준다.
- [ ] **Step 4: 통과 확인** — Run: `npm test` → 전부 PASS. Run: `npm run build && npx vite preview` → `dist/manifest.webmanifest`와 `sw.js`가 생기고, 개발자도구 오프라인 모드에서 새로고침해도 앱이 열린다.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: pwa manifest, icons, offline, onboarding"`

---

### Task 11: GitHub Pages 배포와 아이폰 확인 (사용자와 함께)

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`(설치와 백업 방법 짧게)

- [ ] **Step 1: 배포 워크플로 작성** — `actions/checkout@v4` → `actions/setup-node@v4`(node 22) → `npm ci` → `npm test` → `npm run build` → `actions/upload-pages-artifact@v3`(path `dist`) → `actions/deploy-pages@v4`. 트리거는 `main`에 push될 때다.
- [ ] **Step 2: 사용자 확인 후 GitHub 저장소 만들기** — 사용자의 GitHub 계정에 공개 저장소 `photo-diary`를 만든다(`gh repo create photo-diary --public --source . --push`). **실행 전에 사용자에게 묻는다.** 그다음 Settings → Pages → Source를 "GitHub Actions"로 바꾼다.
- [ ] **Step 3: 배포 확인** — Run: `gh run watch` → success. `https://<계정>.github.io/photo-diary/`가 열린다.
- [ ] **Step 4: 아이폰 실기기 확인 목록** (사용자와 함께, 결과를 기록한다)
  - Safari로 열면 첫 실행 안내가 나온다. 홈 화면에 추가하고 아이콘으로 열면 안내가 나오지 않고, 상태바와 바탕색이 미색으로 맞는다.
  - 표지 → 종이 넘김 → 달력이 이어지고, 표지의 작은 `+`를 누르면 바로 카메라가 열린다.
  - 카메라로 찍은 뒤 멘트를 쓰지 않고 앱을 종료했다가 다시 열어도 사진이 남아 있다.
  - 갤러리에서 HEIC 사진, 파노라마, 6장을 골라도 앞 5장만 들어가고 안내가 나온다. 촬영 시간이 맞게 표시된다.
  - 꾹 누르기 메뉴가 뜨고 iOS 기본 이미지 메뉴는 뜨지 않는다. "사진 앱에 저장"을 누르면 공유 창에서 이미지 저장이 된다.
  - 달력과 하루 화면에서 좌우로 밀 때 세로 스크롤과 헷갈리지 않는다.
  - 백업 → '파일에 저장' → iCloud Drive에 zip이 생긴다. 불러오기로 복원된다.
  - 비행기 모드에서도 앱이 열리고 기록할 수 있다.
- [ ] **Step 5: Commit & push** — `git add -A && git commit -m "chore: github pages deploy" && git push`
