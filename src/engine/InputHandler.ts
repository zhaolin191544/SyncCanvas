import type { CanvasElement, Tool, Point, ResizeHandle } from '@/types/elements'
import { RenderEngine } from './RenderEngine'
import { hitTestElement, hitTestResizeHandle, getResizeHandleCursor, hitTestRotationHandle } from './HitTest'
import { generateId } from '@/utils/id'
import { DEFAULT_STROKE_COLOR, DEFAULT_FILL_COLOR, DEFAULT_STROKE_WIDTH } from '@/utils/colors'
import { normalizeRect, getElementBounds } from '@/utils/math'

export type InputHandlerCallbacks = {
  onSelectionChange?: (ids: Set<string>) => void
  onElementsChange?: () => void
  onToolReset?: () => void
  onTextEdit?: (element: CanvasElement, screenPos: Point) => void
  onCursorMove?: (worldX: number, worldY: number) => void
  onCursorLeave?: () => void
  onElementCreated?: (element: CanvasElement) => void
  onElementsDeleted?: (ids: string[]) => void
  onElementsMoved?: (ids: Set<string>) => void
  onUndo?: () => void
  onRedo?: () => void
  onDuplicate?: (elements: CanvasElement[]) => void
}

export class InputHandler {
  private engine: RenderEngine
  private currentTool: Tool = 'select'
  private isDrawing: boolean = false
  private isPanning: boolean = false
  private isDragging: boolean = false
  private isResizing: boolean = false
  private isRotating: boolean = false
  private startWorldPos: Point = { x: 0, y: 0 }
  private lastScreenPos: Point = { x: 0, y: 0 }
  private currentResizeHandle: ResizeHandle | null = null
  private originalBounds: Map<string, { x: number; y: number; width: number; height: number }> = new Map()
  private dragStartWorld: Point = { x: 0, y: 0 }
  private callbacks: InputHandlerCallbacks = {}
  // Eraser state
  eraserSize: number = 20
  eraserWorldPos: Point | null = null

  constructor(engine: RenderEngine, callbacks: InputHandlerCallbacks = {}) {
    this.engine = engine
    this.callbacks = callbacks
  }

  setTool(tool: Tool) {
    this.currentTool = tool
    if (tool === 'select') {
      this.engine.canvas.style.cursor = 'default'
    } else if (tool === 'eraser') {
      this.engine.canvas.style.cursor = 'none'
    } else {
      this.engine.canvas.style.cursor = 'crosshair'
    }
    if (tool !== 'eraser') {
      this.eraserWorldPos = null
      this.engine.markDirty()
    }
  }

  getTool(): Tool {
    return this.currentTool
  }

  setCallbacks(callbacks: InputHandlerCallbacks) {
    this.callbacks = callbacks
  }

  handleMouseDown(e: MouseEvent) {
    const rect = this.engine.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.engine.camera.screenToWorld(screenX, screenY)

    this.lastScreenPos = { x: e.clientX, y: e.clientY }
    this.startWorldPos = worldPos

    // Middle mouse or space+left for panning
    if (e.button === 1) {
      this.isPanning = true
      this.engine.canvas.style.cursor = 'grabbing'
      return
    }

    if (e.button !== 0) return

    if (this.currentTool === 'select') {
      this.handleSelectMouseDown(worldPos, e.shiftKey)
    } else if (this.currentTool === 'eraser') {
      this.handleEraserAction(worldPos)
    } else {
      this.handleDrawMouseDown(worldPos)
    }
  }

  handleMouseLeave(_e: MouseEvent) {
    this.callbacks.onCursorLeave?.()
    if (this.currentTool === 'eraser') {
      this.eraserWorldPos = null
      this.engine.eraserCursor = null
      this.engine.markDirty()
    }
  }

  handleMouseMove(e: MouseEvent) {
    const rect = this.engine.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.engine.camera.screenToWorld(screenX, screenY)

    // Broadcast cursor position for awareness
    this.callbacks.onCursorMove?.(worldPos.x, worldPos.y)

    if (this.isPanning) {
      const dx = e.clientX - this.lastScreenPos.x
      const dy = e.clientY - this.lastScreenPos.y
      this.engine.camera.pan(dx, dy)
      this.lastScreenPos = { x: e.clientX, y: e.clientY }
      this.engine.markDirty()
      return
    }

    if (this.currentTool === 'eraser') {
      this.eraserWorldPos = worldPos
      this.engine.eraserCursor = { x: worldPos.x, y: worldPos.y, size: this.eraserSize }
      this.engine.markDirty()
      if (this.isDrawing) {
        this.handleEraserAction(worldPos)
      }
    } else if (this.currentTool === 'select') {
      this.handleSelectMouseMove(worldPos, screenX, screenY, e)
    } else if (this.isDrawing) {
      this.handleDrawMouseMove(worldPos)
    }
  }

  handleMouseUp(e: MouseEvent) {
    if (this.isPanning) {
      this.isPanning = false
      this.engine.canvas.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair'
      return
    }

    if (this.currentTool === 'select') {
      this.handleSelectMouseUp()
    } else if (this.currentTool === 'eraser') {
      this.isDrawing = false
      // Keep eraser cursor visible for hover feedback
    } else if (this.isDrawing) {
      this.handleDrawMouseUp()
    }
  }

  handleWheel(e: WheelEvent) {
    e.preventDefault()
    const rect = this.engine.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom
      this.engine.camera.zoomAtPoint(screenX, screenY, e.deltaY * 3)
    } else {
      this.engine.camera.zoomAtPoint(screenX, screenY, e.deltaY)
    }
    this.engine.markDirty()
  }

  handleDoubleClick(e: MouseEvent) {
    const rect = this.engine.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.engine.camera.screenToWorld(screenX, screenY)

    // Check if double-clicked on existing text
    const sorted = this.engine.getSortedElements().reverse()
    for (const el of sorted) {
      if (el.locked) continue
      if (hitTestElement(worldPos, el)) {
        if (el.type === 'text') {
          this.callbacks.onTextEdit?.(el, { x: e.clientX, y: e.clientY })
          return
        }
      }
    }

    // Create new text element
    const textEl: CanvasElement = {
      id: generateId(),
      type: 'text',
      x: worldPos.x,
      y: worldPos.y,
      width: 100,
      height: 24,
      rotation: 0,
      strokeColor: DEFAULT_STROKE_COLOR,
      fillColor: DEFAULT_FILL_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      opacity: 1,
      visible: true,
      locked: false,
      name: '', // Empty name will use type-based default in UI
      text: '',
      fontSize: 16,
      createdBy: 'local',
      createdAt: Date.now(),
      zIndex: this.engine.getNextZIndex(),
    }
    this.engine.addElement(textEl)
    this.callbacks.onElementCreated?.(textEl)
    this.callbacks.onTextEdit?.(textEl, { x: e.clientX, y: e.clientY })
    this.callbacks.onElementsChange?.()
  }

  handleKeyDown(e: KeyboardEvent) {
    // Don't handle shortcuts when editing text
    if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.engine.selection.selectedIds.size > 0) {
        const deletedIds = this.engine.selection.deleteSelected(this.engine.elements)
        this.engine.markDirty()
        this.callbacks.onSelectionChange?.(new Set())
        this.callbacks.onElementsDeleted?.(deletedIds)
        this.callbacks.onElementsChange?.()
      }
    }

    if (!(e.ctrlKey || e.metaKey)) return

    switch (e.key.toLowerCase()) {
      case 'a':
        e.preventDefault()
        this.engine.selection.selectAll(this.engine.elements)
        this.engine.markDirty()
        this.callbacks.onSelectionChange?.(new Set(this.engine.selection.selectedIds))
        break
      case 'z':
        e.preventDefault()
        if (e.shiftKey) {
          this.callbacks.onRedo?.()
        } else {
          this.callbacks.onUndo?.()
        }
        break
      case 'y':
        e.preventDefault()
        this.callbacks.onRedo?.()
        break
      case 'd':
        e.preventDefault()
        this.handleDuplicate()
        break
    }
  }

  private handleDuplicate() {
    if (this.engine.selection.selectedIds.size === 0) return
    const duplicated: CanvasElement[] = []
    for (const id of this.engine.selection.selectedIds) {
      const el = this.engine.elements.get(id)
      if (el) {
        const newEl: CanvasElement = {
          ...el,
          id: generateId(),
          x: el.x + 20,
          y: el.y + 20,
          zIndex: this.engine.getNextZIndex(),
          points: el.points ? el.points.map(p => [...p]) : undefined,
        }
        this.engine.addElement(newEl)
        duplicated.push(newEl)
      }
    }
    if (duplicated.length > 0) {
      this.engine.selection.clearSelection()
      for (const el of duplicated) {
        this.engine.selection.select(el.id, true)
      }
      this.engine.markDirty()
      this.callbacks.onDuplicate?.(duplicated)
      this.callbacks.onSelectionChange?.(new Set(this.engine.selection.selectedIds))
    }
  }

  private handleEraserAction(worldPos: Point) {
    this.isDrawing = true
    const radius = this.eraserSize / this.engine.camera.zoom
    const elementsToProcess = Array.from(this.engine.elements.values())
    const deletedIds: string[] = []
    const createdElements: CanvasElement[] = []

    for (const el of elementsToProcess) {
      if (el.type === 'freehand' && el.points) {
        // Partial erase: remove points within eraser radius, split into segments
        const result = this.eraseFreehandPoints(el, worldPos, radius)
        if (result.removed) {
          deletedIds.push(el.id)
          this.engine.elements.delete(el.id)
          for (const seg of result.segments) {
            this.engine.addElement(seg)
            createdElements.push(seg)
          }
        }
      } else {
        // For geometric shapes: delete if eraser circle overlaps
        const dist = this.distToElement(worldPos, el)
        if (dist <= radius) {
          deletedIds.push(el.id)
          this.engine.elements.delete(el.id)
        }
      }
    }

    if (deletedIds.length > 0 || createdElements.length > 0) {
      this.engine.markDirty()
      if (deletedIds.length > 0) {
        this.callbacks.onElementsDeleted?.(deletedIds)
      }
      for (const el of createdElements) {
        this.callbacks.onElementCreated?.(el)
      }
      this.callbacks.onElementsChange?.()
    }
  }

  private eraseFreehandPoints(
    el: CanvasElement,
    pos: Point,
    radius: number
  ): { removed: boolean; segments: CanvasElement[] } {
    const points = el.points!
    // Check if any point is within the eraser radius
    let hasErasedPoint = false
    const kept: boolean[] = points.map(p => {
      const dx = p[0] - pos.x
      const dy = p[1] - pos.y
      const inRange = Math.sqrt(dx * dx + dy * dy) < radius
      if (inRange) hasErasedPoint = true
      return !inRange
    })

    if (!hasErasedPoint) return { removed: false, segments: [] }

    // Split into contiguous segments of kept points
    const segments: CanvasElement[] = []
    let currentSeg: number[][] = []

    for (let i = 0; i < points.length; i++) {
      if (kept[i]) {
        currentSeg.push(points[i])
      } else {
        if (currentSeg.length >= 3) {
          segments.push(this.createFreehandSegment(el, currentSeg))
        }
        currentSeg = []
      }
    }
    if (currentSeg.length >= 3) {
      segments.push(this.createFreehandSegment(el, currentSeg))
    }

    return { removed: true, segments }
  }

  private createFreehandSegment(original: CanvasElement, points: number[][]): CanvasElement {
    return {
      ...original,
      id: generateId(),
      points: points.map(p => [...p]),
      zIndex: this.engine.getNextZIndex(),
    }
  }

  private distToElement(pos: Point, el: CanvasElement): number {
    if (el.type === 'line' || el.type === 'arrow') {
      const x1 = el.x, y1 = el.y
      const x2 = el.x + el.width, y2 = el.y + el.height
      return this.distToLineSegment(pos, x1, y1, x2, y2)
    }
    if (el.type === 'text') {
      return this.distToRect(pos, el.x, el.y, el.width, el.height)
    }
    // Rectangle/ellipse: check distance to edges
    return this.distToRect(pos, el.x, el.y, el.width, el.height)
  }

  private distToLineSegment(p: Point, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.sqrt((p.x - x1) ** 2 + (p.y - y1) ** 2)
    let t = ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2)
  }

  private distToRect(p: Point, rx: number, ry: number, rw: number, rh: number): number {
    // Distance to nearest edge of rectangle
    const cx = Math.max(rx, Math.min(p.x, rx + rw))
    const cy = Math.max(ry, Math.min(p.y, ry + rh))
    return Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)
  }

  // --- Select tool handlers ---

  private handleSelectMouseDown(worldPos: Point, shiftKey: boolean) {
    // Check resize handles first (only for single selection)
    if (this.engine.selection.selectedIds.size === 1) {
      const selectedId = Array.from(this.engine.selection.selectedIds)[0]
      const el = this.engine.elements.get(selectedId)
      if (el) {
        if (hitTestRotationHandle(worldPos, el, this.engine.camera.zoom)) {
          if (this.isRotating === undefined) { // In mouseDown
             this.isRotating = true
             this.dragStartWorld = { ...worldPos }
          }
          this.engine.canvas.style.cursor = 'alias'
          return
        }
        const handle = hitTestResizeHandle(worldPos, el, this.engine.camera.zoom)
        if (handle) {
          this.isResizing = true
          this.currentResizeHandle = handle
          this.dragStartWorld = { ...worldPos }
          this.originalBounds.clear()
          this.originalBounds.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height })
          return
        }
      }
    }

    // Hit test elements (top to bottom)
    const sorted = this.engine.getSortedElements().reverse()
    let hitElement: CanvasElement | null = null
    for (const el of sorted) {
      if (el.locked) continue
      if (hitTestElement(worldPos, el)) {
        hitElement = el
        break
      }
    }

    if (hitElement) {
      if (!this.engine.selection.isSelected(hitElement.id)) {
        this.engine.selection.select(hitElement.id, shiftKey)
      }
      this.isDragging = true
      this.dragStartWorld = { ...worldPos }
      this.engine.markDirty()
      this.callbacks.onSelectionChange?.(new Set(this.engine.selection.selectedIds))
    } else {
      // Start selection box
      if (!shiftKey) this.engine.selection.clearSelection()
      this.engine.selectionBoxStart = { ...worldPos }
      this.engine.selectionBoxEnd = { ...worldPos }
      this.engine.markDirty()
      this.callbacks.onSelectionChange?.(new Set())
    }
  }

  private handleSelectMouseMove(worldPos: Point, screenX: number, screenY: number, e: MouseEvent) {
    if (this.isRotating && this.engine.selection.selectedIds.size === 1) {
      const id = Array.from(this.engine.selection.selectedIds)[0]
      const el = this.engine.elements.get(id)
      if (el) {
        const bounds = getElementBounds(el)
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        // Calculate angle between center and current mouse position
        // Adding PI/2 because handle is at top (offset by 90 deg)
        el.rotation = Math.atan2(worldPos.y - centerY, worldPos.x - centerX) + Math.PI / 2
        this.engine.markDirty()
      }
      return
    }

    if (this.isResizing && this.currentResizeHandle) {
      const totalDx = worldPos.x - this.dragStartWorld.x
      const totalDy = worldPos.y - this.dragStartWorld.y
      this.engine.selection.resizeSelected(
        this.engine.elements,
        this.currentResizeHandle,
        0, 0,
        this.originalBounds,
        totalDx,
        totalDy,
      )
      this.engine.markDirty()
      return
    }

    if (this.isDragging) {
      const dx = worldPos.x - this.dragStartWorld.x
      const dy = worldPos.y - this.dragStartWorld.y
      this.engine.selection.moveSelected(this.engine.elements, dx, dy)
      this.dragStartWorld = { ...worldPos }
      this.engine.markDirty()
      return
    }

    if (this.engine.selectionBoxStart) {
      this.engine.selectionBoxEnd = { ...worldPos }
      this.engine.markDirty()
      return
    }

    // Update cursor based on hover
    if (this.engine.selection.selectedIds.size === 1) {
      const selectedId = Array.from(this.engine.selection.selectedIds)[0]
      const el = this.engine.elements.get(selectedId)
      if (el) {
        if (hitTestRotationHandle(worldPos, el, this.engine.camera.zoom)) {
          if (this.isRotating === undefined) { // In mouseDown
             this.isRotating = true
             this.dragStartWorld = { ...worldPos }
          }
          this.engine.canvas.style.cursor = 'alias'
          return
        }
        const handle = hitTestResizeHandle(worldPos, el, this.engine.camera.zoom)
        if (handle) {
          this.engine.canvas.style.cursor = getResizeHandleCursor(handle)
          return
        }
      }
    }

    // Check if hovering over any element
    const sorted = this.engine.getSortedElements().reverse()
    for (const el of sorted) {
      if (hitTestElement(worldPos, el)) {
        this.engine.canvas.style.cursor = 'move'
        return
      }
    }
    this.engine.canvas.style.cursor = 'default'
  }

  private handleSelectMouseUp() {
    if (this.isRotating) {
      this.isRotating = false
      this.callbacks.onElementsMoved?.(this.engine.selection.selectedIds)
      this.callbacks.onElementsChange?.()
      return
    }

    if (this.isDragging) {
      this.isDragging = false
      this.callbacks.onElementsMoved?.(this.engine.selection.selectedIds)
      this.callbacks.onElementsChange?.()
      return
    }

    if (this.isResizing) {
      this.isResizing = false
      this.currentResizeHandle = null
      this.originalBounds.clear()
      this.callbacks.onElementsMoved?.(this.engine.selection.selectedIds)
      this.callbacks.onElementsChange?.()
      return
    }

    if (this.engine.selectionBoxStart && this.engine.selectionBoxEnd) {
      // Finalize selection box
      const box = normalizeRect(
        this.engine.selectionBoxStart.x,
        this.engine.selectionBoxStart.y,
        this.engine.selectionBoxEnd.x,
        this.engine.selectionBoxEnd.y,
      )
      this.engine.selection.selectionBox = box
      this.engine.selection.finishSelectionBox(this.engine.elements)
      this.engine.selectionBoxStart = null
      this.engine.selectionBoxEnd = null
      this.engine.markDirty()
      this.callbacks.onSelectionChange?.(new Set(this.engine.selection.selectedIds))
    }
  }

  // --- Draw tool handlers ---

  private handleDrawMouseDown(worldPos: Point) {
    this.isDrawing = true
    this.startWorldPos = { ...worldPos }

    const baseElement: CanvasElement = {
      id: generateId(),
      type: this.currentTool as CanvasElement['type'],
      x: worldPos.x,
      y: worldPos.y,
      width: 0,
      height: 0,
      rotation: 0,
      strokeColor: DEFAULT_STROKE_COLOR,
      fillColor: DEFAULT_FILL_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      opacity: 1,
      visible: true,
      locked: false,
      name: '',
      createdBy: 'local',
      createdAt: Date.now(),
      zIndex: this.engine.getNextZIndex(),
    }

    if (this.currentTool === 'freehand') {
      baseElement.points = [[worldPos.x, worldPos.y]]
    }

    this.engine.previewElement = baseElement
    this.engine.markDirty()
  }

  private handleDrawMouseMove(worldPos: Point) {
    const preview = this.engine.previewElement
    if (!preview) return

    if (this.currentTool === 'freehand') {
      preview.points = [...(preview.points || []), [worldPos.x, worldPos.y]]
    } else if (this.currentTool === 'line' || this.currentTool === 'arrow') {
      preview.width = worldPos.x - this.startWorldPos.x
      preview.height = worldPos.y - this.startWorldPos.y
    } else {
      // Rectangle, ellipse
      preview.x = Math.min(this.startWorldPos.x, worldPos.x)
      preview.y = Math.min(this.startWorldPos.y, worldPos.y)
      preview.width = Math.abs(worldPos.x - this.startWorldPos.x)
      preview.height = Math.abs(worldPos.y - this.startWorldPos.y)
    }

    this.engine.markDirty()
  }

  private handleDrawMouseUp() {
    this.isDrawing = false
    const preview = this.engine.previewElement
    if (!preview) return

    // Only add if it has some size
    const hasSize = this.currentTool === 'freehand'
      ? (preview.points && preview.points.length > 2)
      : (Math.abs(preview.width) > 2 || Math.abs(preview.height) > 2)

    if (hasSize) {
      const newEl = { ...preview }
      this.engine.addElement(newEl)
      this.callbacks.onElementCreated?.(newEl)
      this.callbacks.onElementsChange?.()
    }

    this.engine.previewElement = null
    this.engine.markDirty()
  }

  destroy() {
    // Cleanup if needed
  }
}
