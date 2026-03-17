import type { CanvasElement } from '@/types/elements'

export function drawLine(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  ctx.beginPath()
  ctx.moveTo(el.x, el.y)
  ctx.lineTo(el.x + el.width, el.y + el.height)

  ctx.strokeStyle = el.strokeColor
  ctx.lineWidth = el.strokeWidth
  ctx.globalAlpha = el.opacity
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
}
