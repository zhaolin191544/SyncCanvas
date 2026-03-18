export type ElementType = 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'freehand' | 'text' | 'image'

export type Tool = 'select' | 'eraser' | ElementType

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  points?: number[][]
  text?: string
  fontSize?: number
  src?: string // For image elements (base64 or URL)
  name?: string // Optional name for elements
  visible?: boolean // Visibility toggle
  locked?: boolean // Lock toggle
  controlPoints?: number[][] // Bezier control points for lines/arrows [[cx,cy], ...]
  createdBy: string
  createdAt: number
  zIndex: number
}

export interface Camera {
  x: number
  y: number
  zoom: number
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export interface SelectionState {
  selectedIds: Set<string>
  selectionBox: Bounds | null
  resizeHandle: ResizeHandle | null
  isDragging: boolean
  isResizing: boolean
}
