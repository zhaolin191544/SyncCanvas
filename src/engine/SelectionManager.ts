import type { CanvasElement, Point, Bounds, ResizeHandle } from '@/types/elements'
import { getElementBounds, boundsOverlap, normalizeRect } from '@/utils/math'

export class SelectionManager {
  selectedIds: Set<string> = new Set()
  selectionBox: Bounds | null = null

  select(id: string, additive: boolean = false) {
    if (!additive) this.selectedIds.clear()
    this.selectedIds.add(id)
  }

  deselect(id: string) {
    this.selectedIds.delete(id)
  }

  clearSelection() {
    this.selectedIds.clear()
    this.selectionBox = null
  }

  selectAll(elements: Map<string, CanvasElement>) {
    this.selectedIds = new Set(elements.keys())
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id)
  }

  startSelectionBox(point: Point) {
    this.selectionBox = { x: point.x, y: point.y, width: 0, height: 0 }
  }

  updateSelectionBox(point: Point) {
    if (!this.selectionBox) return
    this.selectionBox = normalizeRect(
      this.selectionBox.x,
      this.selectionBox.y,
      point.x,
      point.y,
    )
    // Keep original start point for correct resizing
    // We store as normalized but need original for update
  }

  finishSelectionBox(elements: Map<string, CanvasElement>) {
    if (!this.selectionBox) return
    this.selectedIds.clear()
    for (const [id, el] of elements) {
      const bounds = getElementBounds(el)
      if (boundsOverlap(this.selectionBox, bounds)) {
        this.selectedIds.add(id)
      }
    }
    this.selectionBox = null
  }

  getSelectedBounds(elements: Map<string, CanvasElement>): Bounds | null {
    if (this.selectedIds.size === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of this.selectedIds) {
      const el = elements.get(id)
      if (!el) continue
      const b = getElementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    }
    if (minX === Infinity) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  moveSelected(elements: Map<string, CanvasElement>, dx: number, dy: number) {
    for (const id of this.selectedIds) {
      const el = elements.get(id)
      if (!el) continue
      el.x += dx
      el.y += dy
      if (el.points) {
        el.points = el.points.map(p => [p[0] + dx, p[1] + dy])
      }
    }
  }

  resizeSelected(
    elements: Map<string, CanvasElement>,
    handle: ResizeHandle,
    dx: number,
    dy: number,
    originalBounds: Map<string, { x: number; y: number; width: number; height: number }>,
    totalDx: number,
    totalDy: number,
  ) {
    if (this.selectedIds.size !== 1) return
    const id = Array.from(this.selectedIds)[0]
    const el = elements.get(id)
    const orig = originalBounds.get(id)
    if (!el || !orig) return

    let newX = orig.x
    let newY = orig.y
    let newW = orig.width
    let newH = orig.height

    if (handle.includes('w')) {
      newX = orig.x + totalDx
      newW = orig.width - totalDx
    }
    if (handle.includes('e')) {
      newW = orig.width + totalDx
    }
    if (handle.includes('n')) {
      newY = orig.y + totalDy
      newH = orig.height - totalDy
    }
    if (handle.includes('s')) {
      newH = orig.height + totalDy
    }

    el.x = newX
    el.y = newY
    el.width = newW
    el.height = newH
  }

  deleteSelected(elements: Map<string, CanvasElement>): string[] {
    const deleted = Array.from(this.selectedIds)
    for (const id of this.selectedIds) {
      elements.delete(id)
    }
    this.selectedIds.clear()
    return deleted
  }
}
