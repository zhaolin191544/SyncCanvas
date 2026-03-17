import type { CanvasElement } from '@/types/elements'

export function drawEllipse(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  const rx = Math.abs(el.width / 2)
  const ry = Math.abs(el.height / 2)

  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)

  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillStyle = el.fillColor
    ctx.globalAlpha = el.opacity
    ctx.fill()
  }

  ctx.strokeStyle = el.strokeColor
  ctx.lineWidth = el.strokeWidth
  ctx.globalAlpha = el.opacity
  ctx.stroke()
  ctx.globalAlpha = 1
}
