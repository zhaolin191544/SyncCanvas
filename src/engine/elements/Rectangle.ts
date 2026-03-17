import type { CanvasElement } from '@/types/elements'

export function drawRectangle(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  ctx.beginPath()
  ctx.rect(el.x, el.y, el.width, el.height)

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
