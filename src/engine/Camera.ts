import type { Point, Camera as CameraState } from '@/types/elements'
import { clamp } from '@/utils/math'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_SENSITIVITY = 0.001

export class Camera {
  x: number = 0
  y: number = 0
  zoom: number = 1

  getState(): CameraState {
    return { x: this.x, y: this.y, zoom: this.zoom }
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom,
    }
  }

  worldToScreen(worldX: number, worldY: number): Point {
    return {
      x: worldX * this.zoom + this.x,
      y: worldY * this.zoom + this.y,
    }
  }

  pan(dx: number, dy: number) {
    this.x += dx
    this.y += dy
  }

  zoomAtPoint(screenX: number, screenY: number, delta: number) {
    const worldBefore = this.screenToWorld(screenX, screenY)
    const newZoom = clamp(this.zoom * Math.exp(-delta * ZOOM_SENSITIVITY), MIN_ZOOM, MAX_ZOOM)
    this.zoom = newZoom
    // Adjust position so zoom is centered on cursor
    this.x = screenX - worldBefore.x * this.zoom
    this.y = screenY - worldBefore.y * this.zoom
  }

  applyToContext(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.x, this.y)
    ctx.scale(this.zoom, this.zoom)
  }
}
