'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { RenderEngine } from '@/engine/RenderEngine'
import { getElementBounds } from '@/utils/math'

interface MiniMapProps {
  engineRef: React.RefObject<RenderEngine | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

const MAP_W = 180
const MAP_H = 120
const PAD = 10

export default function MiniMap({ engineRef, canvasRef }: MiniMapProps) {
  const miniRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const dragging = useRef(false)

  const draw = useCallback(() => {
    const mini = miniRef.current
    const engine = engineRef.current
    const mainCanvas = canvasRef.current
    if (!mini || !engine || !mainCanvas) return

    const ctx = mini.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    mini.width = MAP_W * dpr
    mini.height = MAP_H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Background
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, MAP_W, MAP_H)

    const elements = Array.from(engine.elements.values())
    if (elements.length === 0) {
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Empty canvas', MAP_W / 2, MAP_H / 2 + 4)

      // Still draw viewport rect at default scale
      drawViewport(ctx, engine, mainCanvas, 1, 0, 0)
      return
    }

    // Compute world bounds of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of elements) {
      const b = getElementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    }

    const contentW = maxX - minX || 1
    const contentH = maxY - minY || 1
    const scale = Math.min((MAP_W - PAD * 2) / contentW, (MAP_H - PAD * 2) / contentH)
    const offsetX = (MAP_W - contentW * scale) / 2 - minX * scale
    const offsetY = (MAP_H - contentH * scale) / 2 - minY * scale

    // Draw elements as simple shapes
    for (const el of elements) {
      const b = getElementBounds(el)
      const sx = b.x * scale + offsetX
      const sy = b.y * scale + offsetY
      const sw = b.width * scale
      const sh = b.height * scale

      ctx.fillStyle = el.fillColor !== 'transparent' ? el.fillColor : 'rgba(59,130,246,0.15)'
      ctx.strokeStyle = el.strokeColor || '#3b82f6'
      ctx.lineWidth = 1

      if (el.type === 'ellipse') {
        ctx.beginPath()
        ctx.ellipse(sx + sw / 2, sy + sh / 2, Math.max(sw / 2, 0.5), Math.max(sh / 2, 0.5), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else if (el.type === 'freehand' && el.points && el.points.length > 1) {
        ctx.beginPath()
        ctx.moveTo(el.points[0][0] * scale + offsetX, el.points[0][1] * scale + offsetY)
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i][0] * scale + offsetX, el.points[i][1] * scale + offsetY)
        }
        ctx.stroke()
      } else if (el.type === 'line' || el.type === 'arrow') {
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + sw, sy + sh)
        ctx.stroke()
      } else if (el.type === 'text') {
        ctx.fillStyle = el.strokeColor || '#334155'
        ctx.fillRect(sx, sy, Math.max(sw, 2), Math.max(sh, 2))
      } else {
        ctx.fillRect(sx, sy, sw, sh)
        ctx.strokeRect(sx, sy, sw, sh)
      }
    }

    drawViewport(ctx, engine, mainCanvas, scale, offsetX, offsetY)
  }, [engineRef, canvasRef])

  useEffect(() => {
    const loop = () => {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    // Update at ~10fps to save resources
    const interval = setInterval(() => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    }, 100)
    return () => {
      clearInterval(interval)
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current
    const mainCanvas = canvasRef.current
    const mini = miniRef.current
    if (!engine || !mainCanvas || !mini) return

    const rect = mini.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const elements = Array.from(engine.elements.values())
    if (elements.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const el of elements) {
      const b = getElementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.width)
      maxY = Math.max(maxY, b.y + b.height)
    }

    const contentW = maxX - minX || 1
    const contentH = maxY - minY || 1
    const scale = Math.min((MAP_W - PAD * 2) / contentW, (MAP_H - PAD * 2) / contentH)
    const offsetX = (MAP_W - contentW * scale) / 2 - minX * scale
    const offsetY = (MAP_H - contentH * scale) / 2 - minY * scale

    // Convert minimap click to world coordinates
    const worldX = (mx - offsetX) / scale
    const worldY = (my - offsetY) / scale

    const dpr = window.devicePixelRatio || 1
    const viewW = mainCanvas.width / dpr
    const viewH = mainCanvas.height / dpr

    // Center viewport on clicked world point
    engine.camera.x = viewW / 2 - worldX * engine.camera.zoom
    engine.camera.y = viewH / 2 - worldY * engine.camera.zoom
    engine.markDirty()
  }, [engineRef, canvasRef])

  return (
    <div className="absolute bottom-14 right-4 z-10 rounded-xl overflow-hidden shadow-lg border border-gray-200/80 bg-white/90 backdrop-blur-sm">
      <canvas
        ref={miniRef}
        width={MAP_W}
        height={MAP_H}
        style={{ width: MAP_W, height: MAP_H, cursor: 'crosshair' }}
        onClick={handleClick}
      />
    </div>
  )
}

function drawViewport(
  ctx: CanvasRenderingContext2D,
  engine: RenderEngine,
  mainCanvas: HTMLCanvasElement,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const dpr = window.devicePixelRatio || 1
  const viewW = mainCanvas.width / dpr
  const viewH = mainCanvas.height / dpr

  const topLeft = engine.camera.screenToWorld(0, 0)
  const bottomRight = engine.camera.screenToWorld(viewW, viewH)

  const vx = topLeft.x * scale + offsetX
  const vy = topLeft.y * scale + offsetY
  const vw = (bottomRight.x - topLeft.x) * scale
  const vh = (bottomRight.y - topLeft.y) * scale

  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1.5
  ctx.strokeRect(vx, vy, vw, vh)
  ctx.fillStyle = 'rgba(59, 130, 246, 0.06)'
  ctx.fillRect(vx, vy, vw, vh)
}
