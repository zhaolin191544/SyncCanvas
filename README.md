# SyncCanvas

Real-time collaborative whiteboard built with Next.js, Yjs CRDT, and HTML Canvas.

Multiple users can draw, annotate, and brainstorm together in the same canvas with live cursor tracking, selection awareness, and conflict-free synchronization.

## Features

- **Real-time collaboration** — Yjs CRDT ensures conflict-free multi-user editing with WebSocket sync
- **Drawing tools** — Rectangle, ellipse, line, arrow, freehand pen, text, and partial eraser
- **User authentication** — JWT-based login/register with password-protected rooms
- **Live presence** — See remote cursors, selections, and online users in real-time
- **Undo/Redo** — Per-user undo history via Yjs UndoManager
- **MiniMap** — Thumbnail overview with viewport indicator and click-to-navigate
- **Export PNG** — Export canvas content as high-resolution PNG image
- **Property panel** — Edit stroke color, fill, line width, opacity for selected elements
- **Viewport culling** — Only renders elements visible in the current viewport for performance
- **Keyboard shortcuts** — Full shortcut support for tools, selection, undo/redo, and more
- **Offline persistence** — IndexedDB caching via y-indexeddb for offline data retention

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Next.js Frontend                │
│  ┌────────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Canvas 2D  │  │  React   │  │  Yjs CRDT    │ │
│  │  Render     │  │  UI      │  │  Document    │ │
│  │  Engine     │  │  Layer   │  │  + Awareness │ │
│  └──────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│         │             │               │          │
│         └─────────────┼───────────────┘          │
│                       │                          │
└───────────────────────┼──────────────────────────┘
                        │ WebSocket (JWT auth)
┌───────────────────────┼──────────────────────────┐
│              ┌────────┴────────┐                 │
│              │  y-websocket    │                 │
│              │  Server (Node)  │                 │
│              └────────┬────────┘                 │
│                       │                          │
│              ┌────────┴────────┐                 │
│              │   PostgreSQL    │                 │
│              │  (Users/Rooms)  │                 │
│              └─────────────────┘                 │
└──────────────────────────────────────────────────┘
```

### Key Modules

| Module | Path | Description |
|--------|------|-------------|
| Render Engine | `src/engine/RenderEngine.ts` | Canvas 2D rendering with viewport culling, grid, selections, cursors |
| Camera | `src/engine/Camera.ts` | Pan/zoom with screen-to-world coordinate transforms |
| Input Handler | `src/engine/InputHandler.ts` | Mouse/keyboard event processing, tool state machine, eraser logic |
| Selection Manager | `src/engine/SelectionManager.ts` | Multi-select, bounding box, resize handles |
| Element Renderers | `src/engine/elements/` | Draw functions for each shape type |
| Yjs Provider | `src/collaboration/YjsProvider.tsx` | WebSocket connection, Yjs doc, awareness context |
| Yjs Elements | `src/collaboration/useYjsElements.ts` | Bidirectional sync between Yjs Map and engine elements |
| Awareness | `src/collaboration/useAwareness.ts` | Remote cursor/selection broadcasting with user deduplication |
| Undo Manager | `src/collaboration/useUndoManager.ts` | Per-user undo/redo via Yjs UndoManager |
| Auth | `src/lib/auth.ts` | JWT token signing/verification, bcrypt password hashing |
| API Routes | `src/app/api/` | REST endpoints for auth and room management |

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 + React 19 | App Router, server components, API routes |
| Rendering | HTML Canvas 2D | Direct pixel control, high performance for freehand drawing |
| Collaboration | Yjs + y-websocket | Mature CRDT library with proven conflict resolution |
| Offline | y-indexeddb | Transparent IndexedDB persistence for offline support |
| Database | PostgreSQL + Prisma 5 | Type-safe ORM for user/room management |
| Auth | JWT + bcryptjs | Stateless auth tokens, secure password storage |
| Styling | Tailwind CSS 4 | Utility-first CSS for rapid UI development |
| WebSocket | ws (Node.js) | Lightweight WebSocket server with JWT verification |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or remote)

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd project
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials:
   # DATABASE_URL="postgresql://user:password@localhost:5432/synccanvas"
   # JWT_SECRET="your-secret-key"
   # NEXT_PUBLIC_WS_URL="ws://localhost:1234"
   ```

3. **Initialize database**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Start development servers**
   ```bash
   npm run dev:all
   ```
   This starts both the Next.js dev server (port 3000) and the WebSocket server (port 1234).

5. **Open in browser**
   - Go to `http://localhost:3000`
   - Register an account, create a room with a password
   - Share the room ID and password with collaborators

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run server` | Start WebSocket collaboration server |
| `npm run dev:all` | Start both servers concurrently |
| `npm run build` | Production build |
| `npm run start` | Start production server |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `R` | Rectangle |
| `O` | Ellipse |
| `L` | Line |
| `A` | Arrow |
| `P` | Pencil (freehand) |
| `T` | Text |
| `E` | Eraser |
| `Delete` | Delete selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+D` | Duplicate |
| `Ctrl+A` | Select all |
| Scroll wheel | Zoom |
| Middle-click drag | Pan canvas |
| Double-click | Add text |

## License

MIT
