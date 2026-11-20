import { CanvasTexture, SRGBColorSpace } from 'three';

// Module caches: one texture per distinct text, shared by every sprite that shows it (labels repeat, counts repeat).
const tags = new Map<string, { texture: CanvasTexture; aspect: number }>();

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

/**
 * Monster tag: the formula (dark text, white outline) and, when given, a count pill to its right ("×4").
 * One sprite per monster instead of two. Returns the texture and its width/height ratio.
 */
export function tagTexture(label: string, badge?: string): { texture: CanvasTexture; aspect: number } {
  const key = `${label}|${badge ?? ''}`;
  const hit = tags.get(key);
  if (hit) return hit;
  const H = 96;
  const labelFont = 'bold 64px system-ui, sans-serif';
  const badgeFont = 'bold 40px system-ui, sans-serif';
  const probe = ctx2d(1, 1).ctx;
  const measure = (font: string, text: string, fallback: number) => {
    if (!probe) return fallback;
    probe.font = font;
    return probe.measureText(text).width;
  };
  const lw = measure(labelFont, label, label.length * 36) + 16;
  const bw = badge ? measure(badgeFont, badge, badge.length * 24) + 28 : 0;
  const gap = badge ? 8 : 0;
  const W = Math.ceil(lw + gap + bw);
  const { canvas, ctx } = ctx2d(W, H);
  if (ctx) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = labelFont;
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(label, lw / 2, H / 2 + 4);
    ctx.fillStyle = '#222222';
    ctx.fillText(label, lw / 2, H / 2 + 4);
    if (badge) {
      const x = lw + gap;
      ctx.fillStyle = '#f59e0b';
      pill(ctx, x, 24, bw - 4, 52);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.font = badgeFont;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badge, x + (bw - 4) / 2, 52);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const out = { texture, aspect: W / H };
  tags.set(key, out);
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
