import type { CanvasElement } from '@/types/elements'

export function drawArrow(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  const startX = el.x
  const startY = el.y
  const endX = el.x + el.width
  const endY = el.y + el.height

  ctx.beginPath()
  ctx.moveTo(startX, startY)

  // Determine the tangent direction at the end for arrowhead orientation
  let tangentX: number
  let tangentY: number

  if (el.controlPoints && el.controlPoints.length > 0) {
    const pts = el.controlPoints

    if (pts.length === 1) {
      ctx.quadraticCurveTo(pts[0][0], pts[0][1], endX, endY)
      // Tangent at end of quadratic bezier = direction from last control point to end
      tangentX = endX - pts[0][0]
      tangentY = endY - pts[0][1]
    } else {
      for (let i = 0; i < pts.length; i++) {
        if (i < pts.length - 1) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2
          const my = (pts[i][1] + pts[i + 1][1]) / 2
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
        } else {
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], endX, endY)
        }
      }
      tangentX = endX - pts[pts.length - 1][0]
      tangentY = endY - pts[pts.length - 1][1]
    }
  } else {
    ctx.lineTo(endX, endY)
    tangentX = endX - startX
    tangentY = endY - startY
  }

  ctx.strokeStyle = el.strokeColor
  ctx.lineWidth = el.strokeWidth
  ctx.globalAlpha = el.opacity
  ctx.lineCap = 'round'
  ctx.stroke()

  // Draw arrowhead aligned to curve tangent
  const angle = Math.atan2(tangentY, tangentX)
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
