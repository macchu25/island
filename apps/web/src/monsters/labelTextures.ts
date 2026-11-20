import { CanvasTexture, SRGBColorSpace } from 'three';

// Module caches: one texture per distinct text, shared by every sprite that shows it (labels repeat, counts repeat).
const labels = new Map<string, { texture: CanvasTexture; aspect: number }>();
const badges = new Map<string, { texture: CanvasTexture; aspect: number }>();

function ctx2d(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext?.('2d') ?? null };
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface Tex {
  texture: CanvasTexture;
  /** Width / height of the canvas, for the sprite scale. */
  aspect: number;
}

function measure(font: string, text: string, fallback: number): number {
  const probe = ctx2d(1, 1).ctx;
  if (!probe) return fallback;
  probe.font = font;
  return probe.measureText(text).width;
}

/** Formula tag (dark text, white outline). One shared texture per formula: bounded by the catalog size. */
export function labelTexture(label: string): Tex {
  const hit = labels.get(label);
  if (hit) return hit;
  const H = 96;
  const font = 'bold 64px system-ui, sans-serif';
  const W = Math.ceil(measure(font, label, label.length * 36) + 16);
  const { canvas, ctx } = ctx2d(W, H);
  if (ctx) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = font;
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(label, W / 2, H / 2 + 4);
    ctx.fillStyle = '#222222';
    ctx.fillText(label, W / 2, H / 2 + 4);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const out = { texture, aspect: W / H };
  labels.set(label, out);
  return out;
}

/**
 * Count pill, for example "×4". One shared texture per count text, independent of the formula, so a count change
 * reuses an existing texture instead of creating a new label texture.
 */
export function badgeTexture(text: string): Tex {
  const hit = badges.get(text);
  if (hit) return hit;
  const H = 64;
  const font = 'bold 40px system-ui, sans-serif';
  const W = Math.ceil(measure(font, text, text.length * 24) + 32);
  const { canvas, ctx } = ctx2d(W, H);
  if (ctx) {
    ctx.fillStyle = '#f59e0b';
    pill(ctx, 3, 5, W - 6, H - 10);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, W / 2, H / 2 + 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const out = { texture, aspect: W / H };
  badges.set(text, out);
  return out;
}

/** Wooden name board for a habitat or building. Returns the texture and its width/height ratio. */
export function signTexture(text: string): { texture: CanvasTexture; aspect: number } {
  const h = 96;
  const font = 'bold 52px system-ui, sans-serif';
  const probe = ctx2d(1, 1).ctx;
  let textW = text.length * 30;
  if (probe) {
    probe.font = font;
    textW = probe.measureText(text).width;
  }
  const w = Math.min(1024, Math.ceil(textW + 64));
  const { canvas, ctx } = ctx2d(w, h);
  if (ctx) {
    ctx.fillStyle = '#7a4e2d';
    pill(ctx, 3, 3, w - 6, h - 6);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f6e7c8';
    ctx.stroke();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff8e8';
    ctx.fillText(text, w / 2, h / 2 + 3);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: w / h };
}
