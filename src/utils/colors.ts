const USER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length]
}

export const DEFAULT_STROKE_COLOR = '#1e1e1e'
export const DEFAULT_FILL_COLOR = 'transparent'
export const DEFAULT_STROKE_WIDTH = 2
export const SELECTION_COLOR = '#3b82f6'
export const GRID_COLOR = '#e5e7eb'
