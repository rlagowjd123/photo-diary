import { fitWithin, readTakenAt } from '../../src/media/image';

test('fitWithin', () => {
  expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  expect(fitWithin(12000, 2000, 1600)).toEqual({ width: 1600, height: 267 });
  expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
});
test('readTakenAt falls back when no EXIF', async () => {
  const f = new File(['not an image'], 'a.jpg', { type: 'image/jpeg' });
  expect(await readTakenAt(f, 123)).toBe(123);
});

test('drawFlattened paints white before the photo so transparency is not black in JPEG', async () => {
  const { drawFlattened } = await import('../../src/media/image');
  const calls: string[] = [];
  const ctx = {
    set fillStyle(v: string) { calls.push('fill:' + v); },
    fillRect: () => calls.push('fillRect'),
    drawImage: () => calls.push('drawImage'),
  } as unknown as CanvasRenderingContext2D;
  drawFlattened(ctx, {} as CanvasImageSource, 10, 10);
  expect(calls).toEqual(['fill:#ffffff', 'fillRect', 'drawImage']);
});
