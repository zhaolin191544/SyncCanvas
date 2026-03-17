import type { CanvasElement, Point, ResizeHandle, Bounds } from '@/types/elements'
import { isPointInRect, isPointInEllipse, isPointNearLine, isPointNearFreehand, getElementBounds } from '@/utils/math'

const HANDLE_SIZE = 8

export function hitTestElement(point: Point, el: CanvasElement): boolean {
  switch (el.type) {
    case 'rectangle':
    case 'text':
      return isPointInRect(point, { x: el.x, y: el.y, width: el.width, height: el.height })
    case 'ellipse':
      return isPointInEllipse(point, { x: el.x, y: el.y, width: el.width, height: el.height })
    case 'line':
    case 'arrow':
      return isPointNearLine(
        point,
        { x: el.x, y: el.y },
        { x: el.x + el.width, y: el.y + el.height },
        Math.max(5, el.strokeWidth),
      )
    case 'freehand':
      return el.points ? isPointNearFreehand(point, el.points, Math.max(5, el.strokeWidth)) : false
    default:
      return false
  }
}

export function hitTestResizeHandle(point: Point, el: CanvasElement, zoom: number): ResizeHandle | null {
  const bounds = getElementBounds(el)
  const size = HANDLE_SIZE / zoom
  const handles: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: 'nw', x: bounds.x, y: bounds.y },
    { handle: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
    { handle: 'ne', x: bounds.x + bounds.width, y: bounds.y },
    { handle: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    { handle: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { handle: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    { handle: 'sw', x: bounds.x, y: bounds.y + bounds.height },
    { handle: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 },
  ]

  for (const h of handles) {
    if (
      point.x >= h.x - size &&
      point.x <= h.x + size &&
      point.y >= h.y - size &&
      point.y <= h.y + size
    ) {
      return h.handle
    }
  }
  return null
}

export function getResizeHandleCursor(handle: ResizeHandle): string {
  const cursors: Record<ResizeHandle, string> = {
    nw: 'nwse-resize',
    n: 'ns-resize',
    ne: 'nesw-resize',
    e: 'ew-resize',
    se: 'nwse-resize',
    s: 'ns-resize',
    sw: 'nesw-resize',
    w: 'ew-resize',
  }
  return cursors[handle]
}
