import type { CanvasElement } from '@/types/elements'

export function drawFreehand(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  if (!el.points || el.points.length < 2) return

  ctx.beginPath()
  ctx.moveTo(el.points[0][0], el.points[0][1])

  // Use quadratic curves for smooth lines
  if (el.points.length === 2) {
    ctx.lineTo(el.points[1][0], el.points[1][1])
  } else {
    for (let i = 1; i < el.points.length - 1; i++) {
      const midX = (el.points[i][0] + el.points[i + 1][0]) / 2
      const midY = (el.points[i][1] + el.points[i + 1][1]) / 2
      ctx.quadraticCurveTo(el.points[i][0], el.points[i][1], midX, midY)
    }
    const last = el.points[el.points.length - 1]
    ctx.lineTo(last[0], last[1])
  }

  ctx.strokeStyle = el.strokeColor
  ctx.lineWidth = el.strokeWidth
  ctx.globalAlpha = el.opacity
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
}
