/**
 * Client-side image downscaling for the host-onboarding photo step.
 *
 * Resizes a `File` to a max dimension (1200px by default) using a `<canvas>` and
 * returns a JPEG data URL. Typical output is 150–300 KB per photo, which keeps a
 * 5–6 photo listing draft comfortably inside localStorage's ~5 MB cap.
 *
 * The original file is never stored — only the downscaled data URL.
 */
export interface DownscaleOptions {
  maxDimension?: number;  // px on the longer side. Default 1200.
  quality?: number;       // 0–1. Default 0.85.
  mimeType?: string;      // Output type. Default 'image/jpeg'.
}

export async function downscalePhoto(file: File, opts: DownscaleOptions = {}): Promise<string> {
  const maxDimension = opts.maxDimension ?? 1200;
  const quality = opts.quality ?? 0.85;
  const mimeType = opts.mimeType ?? 'image/jpeg';

  const bitmap = await loadBitmap(file);
  const { width: srcW, height: srcH } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const targetW = Math.round(srcW * scale);
  const targetH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  // Release the decoded bitmap memory ASAP.
  if (typeof (bitmap as ImageBitmap).close === 'function') {
    (bitmap as ImageBitmap).close();
  }

  return canvas.toDataURL(mimeType, quality);
}

/**
 * Prefer `createImageBitmap` (off-main-thread decode, much faster) and fall back
 * to a hidden `<img>` element when not available.
 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
