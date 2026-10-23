import exifr from 'exifr';
import { JPEG_QUALITY, MAX_EDGE } from '../config';

export class ImageError extends Error {}

export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  const s = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * s), height: Math.round(h * s) };
}

type Source = { el: CanvasImageSource; w: number; h: number; close(): void };

async function decode(file: Blob): Promise<Source> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { el: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return { el: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new ImageError('이 사진은 열 수 없어요.');
    }
  }
}

/** 긴 변 1600px, JPEG 0.82로 줄인다. */
export async function shrinkImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const src = await decode(file);
  try {
    const { width, height } = fitWithin(src.w, src.h, MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageError('이 사진은 열 수 없어요.');
    ctx.drawImage(src.el, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new ImageError('이 사진은 열 수 없어요.');
    return { blob, width, height };
  } finally {
    src.close();
  }
}

/** EXIF 촬영 시간. 없거나 못 읽으면 fallback. */
export async function readTakenAt(file: File, fallback: number): Promise<number> {
  try {
    const out = await exifr.parse(file, ['DateTimeOriginal']);
    const d = out?.DateTimeOriginal;
    return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : fallback;
  } catch {
    return fallback;
  }
}
