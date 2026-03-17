import type { Point, Bounds, CanvasElement } from '@/types/elements'

export function screenToWorld(screenX: number, screenY: number, camera: { x: number; y: number; zoom: number }): Point {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  }
}

export function worldToScreen(worldX: number, worldY: number, camera: { x: number; y: number; zoom: number }): Point {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  }
}

export function isPointInRect(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

export function isPointInEllipse(point: Point, bounds: Bounds): boolean {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  if (rx === 0 || ry === 0) return false
  const dx = (point.x - cx) / rx
  const dy = (point.y - cy) / ry
  return dx * dx + dy * dy <= 1
}

export function distanceToLineSegment(point: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(point.x - p1.x, point.y - p1.y)

  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))

  const projX = p1.x + t * dx
  const projY = p1.y + t * dy
  return Math.hypot(point.x - projX, point.y - projY)
}

export function isPointNearLine(point: Point, p1: Point, p2: Point, threshold: number = 5): boolean {
  return distanceToLineSegment(point, p1, p2) <= threshold
}

export function isPointNearFreehand(point: Point, points: number[][], threshold: number = 5): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = { x: points[i][0], y: points[i][1] }
    const p2 = { x: points[i + 1][0], y: points[i + 1][1] }
    if (distanceToLineSegment(point, p1, p2) <= threshold) return true
  }
  return false
}

export function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

export function getElementBounds(el: CanvasElement): Bounds {
  if (el.type === 'line' || el.type === 'arrow') {
    const x = Math.min(el.x, el.x + el.width)
    const y = Math.min(el.y, el.y + el.height)
    return {
      x,
      y,
      width: Math.abs(el.width),
      height: Math.abs(el.height),
    }
  }
  if (el.type === 'freehand' && el.points && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of el.points) {
      minX = Math.min(minX, p[0])
      minY = Math.min(minY, p[1])
      maxX = Math.max(maxX, p[0])
      maxY = Math.max(maxY, p[1])
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height }
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Bounds {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
