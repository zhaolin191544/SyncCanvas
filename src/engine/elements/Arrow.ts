import type { CanvasElement } from '@/types/elements'

export function drawArrow(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  const startX = el.x
  const startY = el.y
  const endX = el.x + el.width
  const endY = el.y + el.height

  // Draw line
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.strokeStyle = el.strokeColor
  ctx.lineWidth = el.strokeWidth
  ctx.globalAlpha = el.opacity
  ctx.lineCap = 'round'
  ctx.stroke()

  // Draw arrowhead
  const angle = Math.atan2(endY - startY, endX - startX)
  const headLen = Math.max(10, el.strokeWidth * 4)

  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLen * Math.cos(angle - Math.PI / 6),
    endY - headLen * Math.sin(angle - Math.PI / 6),
  )
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLen * Math.cos(angle + Math.PI / 6),
    endY - headLen * Math.sin(angle + Math.PI / 6),
  )
  ctx.stroke()
  ctx.globalAlpha = 1
}
