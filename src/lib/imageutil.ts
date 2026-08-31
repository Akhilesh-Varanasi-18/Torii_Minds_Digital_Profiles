// Client-side image orientation helpers (canvas). Used to normalize uploaded
// certificates to a horizontal (landscape) orientation and to let the user
// rotate them manually.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function toDataUrl(canvas: HTMLCanvasElement): string {
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

/** Draw an image rotated by `deg` (0/90/180/270), scaled to fit `maxDim`. */
function drawRotated(img: HTMLImageElement, deg: number, maxDim = 1600): string {
  const rad = (deg * Math.PI) / 180;
  const swap = deg % 180 !== 0;
  const iw = img.width;
  const ih = img.height;
  const rw = swap ? ih : iw; // dimensions after rotation
  const rh = swap ? iw : ih;
  const scale = Math.min(1, maxDim / Math.max(rw, rh));
  const cw = Math.max(1, Math.round(rw * scale));
  const ch = Math.max(1, Math.round(rh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(rad);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -iw / 2, -ih / 2);
  return toDataUrl(canvas);
}

/** Normalize to landscape: if the image is portrait, rotate it 90° CW. */
export async function orientLandscape(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const deg = img.height > img.width ? 90 : 0;
    return drawRotated(img, deg);
  } catch {
    return dataUrl;
  }
}

/** Rotate an image data URL by 90° clockwise (for the manual "Rotate" button). */
export async function rotate90(dataUrl: string): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    return drawRotated(img, 90);
  } catch {
    return dataUrl;
  }
}

/** Small downscaled webp thumbnail (for fast portfolio display of a big image). */
export async function thumbnail(dataUrl: string, max = 480): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    return drawRotated(img, 0, max);
  } catch {
    return dataUrl;
  }
}
