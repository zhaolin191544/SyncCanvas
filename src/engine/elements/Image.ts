import type { CanvasElement } from '@/types/elements'

const imageCache = new Map<string, HTMLImageElement>()

export function drawImage(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  if (el.type !== 'image' || !el.src) return

  let img = imageCache.get(el.src)
  
  if (!img) {
    img = new Image()
    img.src = el.src
    imageCache.set(el.src, img)
    // When image loads, it will be drawn on next frame because engine is notified or markDirty is called elsewhere
    img.onload = () => {
      // Potentially trigger a redraw if we have access to engine, 
      // but usually the next frame will pick it up if it's already in cache
    }
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save()
    ctx.globalAlpha = el.opacity
    ctx.drawImage(img, el.x, el.y, el.width, el.height)
    ctx.restore()
  } else {
    // Draw placeholder while loading
    ctx.save()
    ctx.strokeStyle = '#e2e8f0'
    ctx.setLineDash([5, 5])
    ctx.strokeRect(el.x, el.y, el.width, el.height)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(el.x, el.y, el.width, el.height)
    ctx.restore()
  }
}
