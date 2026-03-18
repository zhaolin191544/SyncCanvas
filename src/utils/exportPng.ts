import type { CanvasElement } from '@/types/elements'
import { getElementBounds } from '@/utils/math'
import { drawRectangle } from '@/engine/elements/Rectangle'
import { drawEllipse } from '@/engine/elements/Ellipse'
import { drawLine } from '@/engine/elements/Line'
import { drawArrow } from '@/engine/elements/Arrow'
import { drawFreehand } from '@/engine/elements/Freehand'
import { drawText } from '@/engine/elements/Text'
import { drawImage } from '@/engine/elements/Image'

const EXPORT_PADDING = 40

export function exportToPng(elements: Map<string, CanvasElement>) {
  const els = Array.from(elements.values()).sort((a, b) => a.zIndex - b.zIndex)
  if (els.length === 0) return

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of els) {
    const b = getElementBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }

  const width = (maxX - minX) + EXPORT_PADDING * 2
  const height = (maxY - minY) + EXPORT_PADDING * 2

  // Create offscreen canvas
  const dpr = 2 // Export at 2x for quality
  const canvas = document.createElement('canvas')
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Translate so elements start at padding
  ctx.translate(EXPORT_PADDING - minX, EXPORT_PADDING - minY)

  // Draw all elements
  for (const el of els) {
    ctx.save()
    switch (el.type) {
      case 'rectangle': drawRectangle(ctx, el); break
      case 'ellipse': drawEllipse(ctx, el); break
      case 'line': drawLine(ctx, el); break
      case 'arrow': drawArrow(ctx, el); break
      case 'freehand': drawFreehand(ctx, el); break
      case 'text': drawText(ctx, el); break
      case 'image': drawImage(ctx, el); break
    }
    ctx.restore()
  }

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `synccanvas-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
