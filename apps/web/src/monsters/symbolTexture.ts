import { CanvasTexture } from 'three';

/** Draws a chemical symbol on a canvas. No network font. Blank texture if no 2D context (jsdom). */
export function symbolTexture(text: string, color: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext?.('2d') ?? null;
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    const face = 'bold {}px system-ui, sans-serif';
    ctx.font = face.replace('{}', '72');
    const w = ctx.measureText(text).width;
    const maxW = 112;
    if (w > maxW) {
      const size = Math.max(12, Math.floor((72 * maxW) / w));
      ctx.font = face.replace('{}', String(size));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, 64, 68);
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 68);
  }
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
