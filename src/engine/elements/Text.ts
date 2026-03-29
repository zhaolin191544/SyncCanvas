import type { CanvasElement } from "@/types/elements";

export function drawText(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  if (!el.text) return;

  const fontSize = el.fontSize || 16;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = el.strokeColor;
  ctx.globalAlpha = el.opacity;
  ctx.textBaseline = "top";

  const lines = el.text.split("\n");
  const lineHeight = fontSize * 1.4;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], el.x, el.y + i * lineHeight);
  }

  ctx.globalAlpha = 1;
}

export function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number = 16,
): { width: number; height: number } {
  ctx.font = `${fontSize}px sans-serif`;
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.4;
  let maxWidth = 0;
  for (const line of lines) {
    const m = ctx.measureText(line);
    maxWidth = Math.max(maxWidth, m.width);
  }
  return { width: maxWidth + 4, height: lines.length * lineHeight };
}
