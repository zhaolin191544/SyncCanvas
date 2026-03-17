import type { CanvasElement, Bounds } from '@/types/elements'
import { Camera } from './Camera'
import { SelectionManager } from './SelectionManager'
import { drawRectangle } from './elements/Rectangle'
import { drawEllipse } from './elements/Ellipse'
import { drawLine } from './elements/Line'
import { drawArrow } from './elements/Arrow'
import { drawFreehand } from './elements/Freehand'
import { drawText } from './elements/Text'
import { drawImage } from './elements/Image'
import { SELECTION_COLOR, GRID_COLOR } from '@/utils/colors'
import { getElementBounds, boundsOverlap } from '@/utils/math'

export class RenderEngine {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  camera: Camera
  elements: Map<string, CanvasElement> = new Map()
  selection: SelectionManager
  private animFrameId: number = 0
  private needsRender: boolean = true
  private renderScheduled: boolean = false
  // For drawing preview
  previewElement: CanvasElement | null = null
  // Selection box for drag-select
  selectionBoxStart: { x: number; y: number } | null = null
  selectionBoxEnd: { x: number; y: number } | null = null
  // Remote users for collaborative rendering
  remoteUsers: { id: string; name: string; color: string; cursor?: { x: number; y: number }; selection?: string[] }[] = []
  // Remote selection highlight colors (elementId -> color)
  remoteSelections: Map<string, string> = new Map()
  // Eraser cursor
  eraserCursor: { x: number; y: number; size: number } | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.camera = new Camera()
    this.selection = new SelectionManager()
  }

  start() {
    const loop = () => {
      if (this.needsRender) {
        this.render()
        this.needsRender = false
      }
      this.animFrameId = requestAnimationFrame(loop)
    }
    this.animFrameId = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.animFrameId)
  }

  markDirty() {
    this.needsRender = true
    if (!this.renderScheduled) {
      this.renderScheduled = true
      requestAnimationFrame(() => {
        this.renderScheduled = false
        if (this.needsRender) {
          this.render()
          this.needsRender = false
        }
      })
      // Fallback for environments where rAF doesn't fire
      setTimeout(() => {
        if (this.needsRender) {
          this.renderScheduled = false
          this.render()
          this.needsRender = false
        }
      }, 16)
    }
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.markDirty()
  }

  private render() {
    const { ctx, canvas } = this
    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    ctx.save()
    ctx.clearRect(0, 0, width, height)

    // Apply camera transform
    this.camera.applyToContext(ctx)

    // Draw grid
    this.drawGrid(width, height)

    // Draw elements sorted by zIndex (with viewport culling)
    const sorted = this.getSortedElements()
    const topLeft = this.camera.screenToWorld(0, 0)
    const bottomRight = this.camera.screenToWorld(width, height)
    const viewBounds: Bounds = {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    }

    for (const el of sorted) {
      // Viewport culling: skip elements completely outside view
      const elBounds = getElementBounds(el)
      if (!boundsOverlap(elBounds, viewBounds)) continue

      this.drawElement(ctx, el)
      // Draw selection highlight
      if (this.selection.isSelected(el.id)) {
        this.drawSelectionHighlight(ctx, el)
      }
    }

    // Draw preview element (while creating)
    if (this.previewElement) {
      this.drawElement(ctx, this.previewElement)
    }

    // Draw selection box
    if (this.selectionBoxStart && this.selectionBoxEnd) {
      this.drawSelectionBox(ctx)
    }

    // Draw remote selections
    this.drawRemoteSelections(ctx)

    // Draw resize handles for selected elements
    if (this.selection.selectedIds.size > 0) {
      this.drawResizeHandles(ctx)
    }

    // Draw remote cursors
    this.drawRemoteCursors(ctx)

    // Draw eraser cursor
    if (this.eraserCursor) {
      this.drawEraserCursor(ctx)
    }

    ctx.restore()
  }

  private drawGrid(viewWidth: number, viewHeight: number) {
    const { ctx, camera } = this
    const gridSize = 20

    const topLeft = camera.screenToWorld(0, 0)
    const bottomRight = camera.screenToWorld(viewWidth, viewHeight)

    const startX = Math.floor(topLeft.x / gridSize) * gridSize
    const startY = Math.floor(topLeft.y / gridSize) * gridSize
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize

    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 0.5 / camera.zoom
    ctx.globalAlpha = 0.5

    ctx.beginPath()
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  private drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
    if (el.visible === false) return
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

  private drawSelectionHighlight(ctx: CanvasRenderingContext2D, el: CanvasElement) {
    const bounds = getElementBounds(el)
    const pad = 4 / this.camera.zoom
    ctx.save()
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = 1.5 / this.camera.zoom
    ctx.setLineDash([4 / this.camera.zoom, 4 / this.camera.zoom])
    ctx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2)
    ctx.setLineDash([])
    ctx.restore()
  }

  private drawResizeHandles(ctx: CanvasRenderingContext2D) {
    const bounds = this.selection.getSelectedBounds(this.elements)
    if (!bounds) return

    const size = 6 / this.camera.zoom
    const handles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width / 2, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height / 2 },
    ]

    ctx.save()
    for (const h of handles) {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = 1.5 / this.camera.zoom
      ctx.fillRect(h.x - size / 2, h.y - size / 2, size, size)
      ctx.strokeRect(h.x - size / 2, h.y - size / 2, size, size)
    }

    // Draw rotation handle
    const rotateHandlePos = { x: bounds.x + bounds.width / 2, y: bounds.y - 30 / this.camera.zoom }
    ctx.beginPath()
    ctx.moveTo(bounds.x + bounds.width / 2, bounds.y)
    ctx.lineTo(rotateHandlePos.x, rotateHandlePos.y)
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = 1 / this.camera.zoom
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(rotateHandlePos.x, rotateHandlePos.y, size * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    ctx.restore()
  }

  private drawSelectionBox(ctx: CanvasRenderingContext2D) {
    if (!this.selectionBoxStart || !this.selectionBoxEnd) return

    const x = Math.min(this.selectionBoxStart.x, this.selectionBoxEnd.x)
    const y = Math.min(this.selectionBoxStart.y, this.selectionBoxEnd.y)
    const w = Math.abs(this.selectionBoxEnd.x - this.selectionBoxStart.x)
    const h = Math.abs(this.selectionBoxEnd.y - this.selectionBoxStart.y)

    ctx.save()
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = SELECTION_COLOR
    ctx.lineWidth = 1 / this.camera.zoom
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }

  private drawRemoteCursors(ctx: CanvasRenderingContext2D) {
    for (const user of this.remoteUsers) {
      if (!user.cursor) continue
      const { x, y } = user.cursor
      const size = 16 / this.camera.zoom
      const labelOffset = 18 / this.camera.zoom
      const fontSize = 11 / this.camera.zoom

      ctx.save()

      // Cursor arrow
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + size)
      ctx.lineTo(x + size * 0.4, y + size * 0.7)
      ctx.lineTo(x + size * 0.7, y + size * 0.7)
      ctx.closePath()
      ctx.fillStyle = user.color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1 / this.camera.zoom
      ctx.stroke()

      // Name label
      ctx.font = `${fontSize}px sans-serif`
      const textWidth = ctx.measureText(user.name).width
      const padding = 4 / this.camera.zoom
      const labelX = x + labelOffset * 0.5
      const labelY = y + labelOffset

      ctx.fillStyle = user.color
      ctx.beginPath()
      ctx.roundRect(
        labelX - padding,
        labelY - fontSize - padding,
        textWidth + padding * 2,
        fontSize + padding * 2,
        3 / this.camera.zoom,
      )
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.fillText(user.name, labelX, labelY - padding)

      ctx.restore()
    }
  }

  private drawRemoteSelections(ctx: CanvasRenderingContext2D) {
    // Build remote selection map
    this.remoteSelections.clear()
    for (const user of this.remoteUsers) {
      if (!user.selection) continue
      for (const elId of user.selection) {
        this.remoteSelections.set(elId, user.color)
      }
    }

    // Draw remote selection highlights
    for (const [elId, color] of this.remoteSelections) {
      const el = this.elements.get(elId)
      if (!el) continue
      const bounds = getElementBounds(el)
      const pad = 4 / this.camera.zoom

      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 2 / this.camera.zoom
      ctx.setLineDash([6 / this.camera.zoom, 3 / this.camera.zoom])
      ctx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2)
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  private drawEraserCursor(ctx: CanvasRenderingContext2D) {
    if (!this.eraserCursor) return
    const { x, y, size } = this.eraserCursor
    const radius = size / this.camera.zoom
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.5 / this.camera.zoom
    ctx.stroke()
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'
    ctx.fill()
    ctx.restore()
  }

  setRemoteUsers(users: { id: string; name: string; color: string; cursor?: { x: number; y: number }; selection?: string[] }[]) {
    this.remoteUsers = users
    this.markDirty()
  }

  getSortedElements(): CanvasElement[] {
    return Array.from(this.elements.values()).sort((a, b) => a.zIndex - b.zIndex)
  }

  getNextZIndex(): number {
    let max = 0
    for (const el of this.elements.values()) {
      max = Math.max(max, el.zIndex)
    }
    return max + 1
  }

  addElement(el: CanvasElement) {
    this.elements.set(el.id, el)
    this.markDirty()
  }

  removeElement(id: string) {
    this.elements.delete(id)
    this.markDirty()
  }

  updateElement(id: string, updates: Partial<CanvasElement>) {
    const el = this.elements.get(id)
    if (!el) return
    Object.assign(el, updates)
    this.markDirty()
  }
}
