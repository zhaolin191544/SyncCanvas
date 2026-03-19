import type { CanvasElement, Point, ResizeHandle, Bounds } from '@/types/elements'
import { isPointInRect, isPointInEllipse, isPointNearLine, isPointNearFreehand, getElementBounds } from '@/utils/math'

const HANDLE_SIZE = 8

export function hitTestElement(point: Point, el: CanvasElement): boolean {
  switch (el.type) {
    case 'rectangle':
    case 'text':
    case 'image':
      return isPointInRect(point, { x: el.x, y: el.y, width: el.width, height: el.height })
    case 'ellipse':
      return isPointInEllipse(point, { x: el.x, y: el.y, width: el.width, height: el.height })
    case 'line':
    case 'arrow': {
      // First check bounding box for easier selection
      const bounds = getElementBounds(el)
      const padding = Math.max(10, el.strokeWidth * 2)
      if (isPointInRect(point, {
        x: bounds.x - padding,
        y: bounds.y - padding,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      })) {
        return true
      }
      return false
    }
    case 'freehand': {
      // First check bounding box for easier selection
      const fBounds = getElementBounds(el)
      const fPadding = Math.max(10, el.strokeWidth * 2)
      if (isPointInRect(point, {
        x: fBounds.x - fPadding,
        y: fBounds.y - fPadding,
        width: fBounds.width + fPadding * 2,
        height: fBounds.height + fPadding * 2,
      })) {
        return true
      }
      return false
    }
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

export function hitTestRotationHandle(point: Point, el: CanvasElement, zoom: number): boolean {
  const bounds = getElementBounds(el)
  const size = HANDLE_SIZE / zoom
  const handlePos = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y - 30 / zoom,
  }

  return (
    point.x >= handlePos.x - size &&
    point.x <= handlePos.x + size &&
    point.y >= handlePos.y - size &&
    point.y <= handlePos.y + size
  )
}

/**
 * Hit test control points on a line/arrow element.
 * Returns the index of the control point hit, or -1 if the midpoint hint is hit (for creating new control point).
 * Returns null if nothing hit.
 */
export function hitTestControlPoint(point: Point, el: CanvasElement, zoom: number): number | null {
  if (el.type !== 'line' && el.type !== 'arrow') return null
  const size = 8 / zoom

  // Check existing control points
  if (el.controlPoints && el.controlPoints.length > 0) {
    for (let i = 0; i < el.controlPoints.length; i++) {
      const cp = el.controlPoints[i]
      const dx = point.x - cp[0]
      const dy = point.y - cp[1]
      if (dx * dx + dy * dy <= size * size) return i
    }
  } else {
    // Check midpoint hint (diamond)
    const mx = (el.x + (el.x + el.width)) / 2
    const my = (el.y + (el.y + el.height)) / 2
    const dx = point.x - mx
    const dy = point.y - my
    if (dx * dx + dy * dy <= size * size) return -1
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
