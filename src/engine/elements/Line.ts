import type { CanvasElement } from '@/types/elements'

export function drawLine(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  ctx.beginPath()
  ctx.moveTo(el.x, el.y)

  if (el.controlPoints && el.controlPoints.length > 0) {
    // Draw as quadratic bezier curve through control points
    const endX = el.x + el.width
    const endY = el.y + el.height

    if (el.controlPoints.length === 1) {
      ctx.quadraticCurveTo(el.controlPoints[0][0], el.controlPoints[0][1], endX, endY)
    } else {
      // Multiple control points: chain quadratic curves
      const pts = el.controlPoints
      for (let i = 0; i < pts.length; i++) {
        if (i < pts.length - 1) {
          // Midpoint between consecutive control points
          const mx = (pts[i][0] + pts[i + 1][0]) / 2
          const my = (pts[i][1] + pts[i + 1][1]) / 2
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
        } else {
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], endX, endY)
        }
      }
    }
  } else {
    ctx.lineTo(el.x + el.width, el.y + el.height)
  }

  ctx.strokeStyle = el.strokeColor
  ctx.lineWidth = el.strokeWidth
  ctx.globalAlpha = el.opacity
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
}
