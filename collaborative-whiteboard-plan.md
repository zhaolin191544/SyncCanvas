# 实时协作白板/画布编辑器 — 项目规划

> **项目代号**: SyncCanvas
> **预计工期**: 4 周（2026.03.17 — 2026.04.13）
> **定位**: 面试作品集项目，展示分布式状态同步、实时通信与复杂交互的工程能力

---

## 一、项目概述

### 1.1 项目定义

一款轻量级、多人实时协作的在线白板应用。用户可以在同一画布上同时绘制图形、编辑文本、拖拽元素，所有操作通过 CRDT 实时同步，支持离线编辑后的自动合并。

### 1.2 核心卖点（面试叙事）

- **CRDT 冲突解决**：不依赖中心化锁或 OT，展示对分布式一致性的理解
- **实时多人协作**：光标感知（awareness）、在线状态、操作广播
- **图形渲染引擎**：Canvas/SVG 混合渲染，涉及 hit-testing、层级管理、视口变换
- **离线优先架构**：IndexedDB 持久化 + 断线重连后的增量同步
- **性能优化**：脏矩形重绘、节流广播、虚拟视口裁剪

### 1.3 与已有项目的差异化定位

| 项目 | 证明的能力 |
|------|-----------|
| 个人博客（Next.js 全栈） | 独立交付完整产品、前后端闭环 |
| BIM/IFC 毕设（R3F + web-ifc） | 3D 渲染、WebGL、领域专业度 |
| **协作白板（本项目）** | **分布式状态同步、实时通信、复杂交互系统设计** |

---

## 二、技术选型

### 2.1 技术栈总览

```
前端框架:    Next.js 14+ (App Router) + TypeScript
状态同步:    Yjs (CRDT) + y-websocket
通信层:      WebSocket (ws 库)
渲染引擎:    HTML Canvas 2D（主渲染） + React 控制层（UI/工具栏）
样式:        Tailwind CSS
持久化:      y-indexeddb（客户端） + 可选 y-redis/y-leveldb（服务端）
部署:        Vercel（前端） + Railway/Fly.io（WebSocket 服务器）
```

### 2.2 关键技术选型理由

**为什么选 Yjs 而不是 Automerge？**
- Yjs 的网络协议更成熟，y-websocket 开箱即用
- Yjs 内存占用更低，适合频繁更新的画布场景
- Yjs 社区更活跃，文档更完善，y-indexeddb 等生态插件丰富
- 面试时可以对比 Yjs vs Automerge 的 trade-off（Yjs 的 encoding 更紧凑但 API 不如 Automerge 直观）

**为什么选 Canvas 而不是 SVG 或 React Three Fiber？**
- Canvas 在大量元素场景下性能远优于 SVG DOM（数百元素时 SVG 会明显卡顿）
- 白板不需要 3D，用 R3F 属于大材小用
- Canvas 需要手动实现 hit-testing 和事件系统，面试时是加分项
- 工具栏/面板等 UI 层仍用 React 渲染，形成 Canvas + React 混合架构

**为什么 WebSocket 而不是 WebRTC？**
- WebSocket 通过服务端中继更稳定，适合生产环境
- Yjs 的 y-websocket 已高度优化，包含自动重连、房间管理
- 面试时可以讨论 WebRTC P2P vs WebSocket 中继的适用场景

---

## 三、功能范围（MVP）

### 3.1 P0 — 核心功能（必须实现）

**绘图工具**
- 矩形、椭圆、直线、箭头、自由画笔
- 文本标签（双击创建/编辑）
- 选择工具：单选、框选、多选
- 拖拽移动、缩放（8 个锚点 resize）
- 删除（Delete/Backspace）

**实时协作**
- 多人同时编辑同一画布，操作实时同步
- 远程光标显示（带用户名标签和颜色标识）
- 在线用户列表
- 房间机制（通过 URL 加入房间）

**画布交互**
- 无限画布（平移 + 缩放）
- 鼠标滚轮缩放、拖拽平移
- 快捷键支持（Ctrl+Z 撤销、Ctrl+Y 重做、Ctrl+A 全选、Delete 删除）

### 3.2 P1 — 增强功能（推荐实现，大幅提升面试深度）

**离线与持久化**
- IndexedDB 本地持久化（y-indexeddb）
- 断网后可继续编辑，重连后自动同步合并
- 连接状态指示器（在线/离线/重连中）

**撤销/重做**
- 基于 Yjs UndoManager，仅回退自己的操作（不影响他人）
- 面试重点：协作场景下的 undo 语义和 OT/CRDT 中 undo 的区别

**UI 细节**
- 工具栏（顶部/侧边）
- 属性面板（选中元素后编辑颜色、线宽、字号）
- 缩略地图（mini-map，显示当前视口在全局画布中的位置）

### 3.3 P2 — 加分功能（时间允许再做）

- 图片上传与嵌入
- 元素锁定/解锁
- 导出为 PNG/SVG
- 深色模式
- 帧选择 + 演示模式（类 FigJam）

---

## 四、系统架构设计

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                     Client (Browser)                 │
│                                                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ React UI │  │  Canvas   │  │   Yjs Document   │  │
│  │ (工具栏/  │  │  Engine   │  │   (Y.Map 共享    │  │
│  │  面板)    │←→│ (渲染/    │←→│    状态)         │  │
│  │          │  │  交互)    │  │                  │  │
│  └──────────┘  └───────────┘  └────────┬─────────┘  │
│                                        │             │
│                               ┌────────┴─────────┐  │
│                               │  y-indexeddb     │  │
│                               │  (离线持久化)     │  │
│                               └────────┬─────────┘  │
└────────────────────────────────────────┼─────────────┘
                                         │ WebSocket
                                         ▼
                          ┌──────────────────────────┐
                          │   WebSocket Server       │
                          │   (y-websocket)          │
                          │                          │
                          │  ┌────────────────────┐  │
                          │  │ Room Management    │  │
                          │  │ Yjs Doc Sync       │  │
                          │  │ Awareness Protocol │  │
                          │  └────────────────────┘  │
                          │                          │
                          │  ┌────────────────────┐  │
                          │  │ Optional:          │  │
                          │  │ y-leveldb 持久化   │  │
                          │  └────────────────────┘  │
                          └──────────────────────────┘
```

### 4.2 Yjs 数据模型设计

```typescript
// Yjs Document 结构
const ydoc = new Y.Doc()

// 核心：元素集合（Y.Map 嵌套 Y.Map）
const yElements = ydoc.getMap('elements')

// 单个元素结构
interface CanvasElement {
  id: string                    // nanoid 生成
  type: 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'freehand' | 'text'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  // 样式
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  // 类型特有属性
  points?: number[][]           // freehand 路径点
  text?: string                 // text 内容
  fontSize?: number
  // 元信息
  createdBy: string
  createdAt: number
  zIndex: number
}

// 层级顺序（Y.Array 维护 zIndex 顺序）
const yOrder = ydoc.getArray('elementOrder')

// Awareness（非持久化，仅在线状态）
// awareness.setLocalStateField('cursor', { x, y })
// awareness.setLocalStateField('user', { name, color })
// awareness.setLocalStateField('selection', [elementId1, elementId2])
```

### 4.3 Canvas 渲染架构

```typescript
// 渲染管线
class RenderEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private camera: { x: number; y: number; zoom: number }
  private elements: Map<string, CanvasElement>
  private dirtyElements: Set<string>       // 脏标记，避免全量重绘

  // 主渲染循环（requestAnimationFrame）
  render() {
    this.ctx.save()
    this.applyCamera()                      // 应用视口变换
    this.drawGrid()                         // 背景网格
    this.drawElements()                     // 按 zIndex 排序绘制
    this.drawSelectionHandles()             // 选中框 + resize 锚点
    this.drawRemoteCursors()                // 远程用户光标
    this.ctx.restore()
  }

  // Hit Testing（点击检测，从上到下遍历）
  hitTest(screenX: number, screenY: number): string | null {
    const worldPos = this.screenToWorld(screenX, screenY)
    // 逆序遍历（最上层元素优先）
    for (const el of this.getSortedElements().reverse()) {
      if (this.isPointInElement(worldPos, el)) return el.id
    }
    return null
  }
}
```

### 4.4 客户端模块划分

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 首页（创建/加入房间）
│   └── board/[roomId]/page.tsx   # 白板页面
│
├── engine/                       # Canvas 渲染引擎（纯逻辑，不依赖 React）
│   ├── RenderEngine.ts           # 渲染管线、Camera、坐标变换
│   ├── HitTest.ts                # 点击检测
│   ├── InputHandler.ts           # 鼠标/键盘事件处理、手势识别
│   ├── SelectionManager.ts       # 选择、多选、拖拽、resize
│   └── elements/                 # 各类元素的绘制与序列化
│       ├── Rectangle.ts
│       ├── Ellipse.ts
│       ├── Line.ts
│       ├── Arrow.ts
│       ├── Freehand.ts
│       └── Text.ts
│
├── collaboration/                # 协作层
│   ├── YjsProvider.tsx           # Yjs + WebSocket 连接管理（React Context）
│   ├── useYjsElements.ts        # 将 Yjs 数据同步为 React state 的 hook
│   ├── useAwareness.ts           # 光标感知 hook
│   ├── useUndoManager.ts         # 基于 Yjs UndoManager 的撤销/重做
│   └── offlineSupport.ts         # y-indexeddb 配置
│
├── components/                   # React UI 组件
│   ├── Toolbar.tsx               # 工具选择栏
│   ├── PropertyPanel.tsx         # 属性编辑面板
│   ├── UserPresence.tsx          # 在线用户头像列表
│   ├── ConnectionStatus.tsx      # 连接状态指示器
│   ├── MiniMap.tsx               # 缩略地图
│   └── Canvas.tsx                # Canvas 容器（桥接 React 与 engine）
│
├── hooks/                        # 通用 hooks
│   ├── useCanvas.ts              # Canvas ref + 初始化引擎
│   ├── useShortcuts.ts           # 快捷键绑定
│   └── useViewport.ts            # 平移缩放控制
│
├── types/                        # TypeScript 类型定义
│   └── elements.ts
│
└── utils/
    ├── colors.ts                 # 用户颜色分配
    ├── id.ts                     # nanoid 封装
    └── math.ts                   # 几何计算（碰撞检测、旋转矩阵等）
```

### 4.5 服务端

```
server/
├── index.ts                      # WebSocket server 入口
├── y-websocket-server.ts         # 基于 y-websocket 的房间管理
└── persistence.ts                # 可选：y-leveldb 持久化
```

服务端非常轻量，核心就是 y-websocket 提供的 `setupWSConnection`，几十行代码即可。面试时重点讲的是客户端的 CRDT 和渲染逻辑。

---

## 五、四周开发计划

### Week 1：基础架构 + 核心绘图（3.17 — 3.23）

**目标**: 单人可以在 Canvas 上绘制基本图形

| 天数 | 任务 |
|------|------|
| Day 1 | 项目初始化：Next.js + TypeScript + Tailwind 脚手架；Canvas 组件挂载；基础 RenderEngine 类 |
| Day 2 | 实现无限画布：Camera 类（pan/zoom）、坐标系变换（screen ↔ world）、鼠标滚轮缩放 + 拖拽平移 |
| Day 3 | 实现矩形、椭圆绘制工具（鼠标按下→拖拽→释放创建元素） |
| Day 4 | 实现直线、箭头、自由画笔工具 |
| Day 5 | Hit Testing + 选择工具：单击选中、框选多选、选中高亮 + resize 锚点 |
| Day 6 | 拖拽移动 + resize + 删除；基础工具栏 UI |
| Day 7 | 缓冲日 / 代码重构整理 |

**Week 1 交付物**: 一个可以单人使用的基础白板，支持绘图、选择、移动、缩放

### Week 2：接入 Yjs + 实时协作（3.24 — 3.30）

**目标**: 两个浏览器窗口可以实时同步操作

| 天数 | 任务 |
|------|------|
| Day 1 | Yjs 集成：创建 Y.Doc、设计 Y.Map 数据结构、将元素 CRUD 改为 Yjs 操作 |
| Day 2 | y-websocket 服务端搭建 + 客户端 WebSocketProvider 连接 |
| Day 3 | 双向同步调试：确保 A 窗口创建/移动/删除 → B 窗口实时反映 |
| Day 4 | Awareness 协议：远程光标位置广播 + 渲染远程光标（带用户名 + 颜色） |
| Day 5 | 远程用户选中状态同步（A 选中元素时 B 看到选中高亮）；在线用户列表 UI |
| Day 6 | 房间机制：URL 路由 `/board/:roomId`，自动创建/加入房间 |
| Day 7 | 联调测试 + 修 bug |

**Week 2 交付物**: 完整的多人实时协作体验，支持光标感知和在线状态

### Week 3：离线支持 + 撤销/重做 + 增强功能（3.31 — 4.6）

**目标**: 生产级的协作体验

| 天数 | 任务 |
|------|------|
| Day 1 | y-indexeddb 接入：离线持久化，刷新页面后数据恢复 |
| Day 2 | 离线编辑 + 重连同步测试：断网编辑 → 恢复网络 → CRDT 自动合并 |
| Day 3 | 连接状态 UI（在线/离线/重连中动画指示器） |
| Day 4 | Yjs UndoManager 接入：实现仅回退自己操作的 undo/redo |
| Day 5 | 属性面板：选中元素后编辑颜色、线宽、透明度 |
| Day 6 | 文本工具：双击画布创建文本框，支持编辑和样式设置 |
| Day 7 | 快捷键系统完善（Ctrl+Z/Y/A/C/V/D 等） |

**Week 3 交付物**: 离线可用、支持撤销重做、带属性编辑的完整白板

### Week 4：打磨 + 部署 + 面试准备（4.7 — 4.13）

**目标**: 可展示、可讲述的面试作品

| 天数 | 任务 |
|------|------|
| Day 1 | UI 打磨：工具栏视觉优化、响应式适配、加载状态、空状态 |
| Day 2 | MiniMap 缩略地图（P1 加分功能） |
| Day 3 | 性能优化：脏矩形重绘、大量元素时的裁剪渲染、节流 awareness 广播 |
| Day 4 | 部署：前端 Vercel + WebSocket 服务器 Railway/Fly.io |
| Day 5 | 写 README：项目介绍、架构图、技术选型理由、本地运行指南 |
| Day 6 | 面试准备：整理可讲述的技术亮点、准备 2-3 个"遇到的挑战"故事 |
| Day 7 | 最终测试 + 录制 Demo 视频/GIF |

---

## 六、面试讲述策略

### 6.1 一句话介绍

> "我做了一个基于 CRDT 的多人实时协作白板，支持多人同时绘图编辑、光标感知、离线编辑和自动冲突合并。"

### 6.2 可以深入展开的技术点（按面试常见追问排列）

**1. 为什么选 CRDT 而不是 OT？**
- OT 需要中心化的 transform 服务器，实现复杂且难以保证正确性
- CRDT 天然支持去中心化，客户端可以离线操作后合并
- Yjs 使用的是基于 sequence CRDT 的实现，O(1) 的 local operation
- 取舍：CRDT 的 metadata 开销（tombstone）比 OT 更大，但在白板场景（元素数量有限）可接受

**2. 冲突场景怎么处理？**
- 两人同时移动同一元素：last-writer-wins（Yjs Y.Map 默认语义），可演示这个行为
- 两人同时创建元素：无冲突，各自生成唯一 ID
- A 删除元素的同时 B 在编辑：删除优先（Yjs 默认），可以讨论不同策略的取舍

**3. 离线怎么实现的？**
- y-indexeddb 将 Yjs 文档的 update 持久化到 IndexedDB
- 断网后所有操作写入本地 Y.Doc
- 重连后 y-websocket 会交换双方的 state vector，只同步差异部分（增量同步）
- CRDT 保证最终一致性，无需手动处理合并

**4. 渲染性能怎么优化？**
- requestAnimationFrame 驱动渲染循环，而非每次状态变更都重绘
- 脏矩形策略：只重绘发生变化的区域
- 视口裁剪：只绘制当前可见区域内的元素
- Awareness 广播节流：光标位置通过 throttle（50ms）发送

**5. Canvas 的 hit-testing 怎么做？**
- 逆序遍历元素（上层优先），用数学判断点是否在图形内
- 矩形用 AABB 判断；椭圆用标准方程；自由画笔用路径距离阈值
- 可以扩展为四叉树优化大量元素的检测性能

**6. 撤销/重做在协作场景下的特殊性？**
- 普通 undo 是全局回退，但协作场景下 A 的 undo 不应该撤销 B 的操作
- Yjs UndoManager 绑定到特定的 Y.Doc 和 trackedOrigins
- 只回退"自己的 transaction"，实现用户维度的 undo

### 6.3 准备 2-3 个 "挑战故事"

建议准备以下角度的故事（开发中遇到时记录下来）：

1. **同步时序问题**: 比如拖拽过程中频繁更新 Yjs 导致的性能问题，如何通过 batching transaction 解决
2. **Canvas 坐标系统**: 屏幕坐标 → 世界坐标的变换，在缩放和平移叠加时容易出错
3. **离线合并的边界情况**: 比如 A 离线删除了元素，B 在线修改了同一元素，重连后的行为

---

## 七、参考资源

### 开源参考（学习但不抄，面试时要能说出差异）
- **Excalidraw** — 最知名的开源白板，架构可参考但它用的是自己的同步方案
- **tldraw** — 优秀的 Canvas 引擎设计，代码质量高
- **y-websocket** — Yjs 官方 WebSocket provider 实现

### 文档
- Yjs 官方文档：https://docs.yjs.dev
- CRDT 入门论文：Marc Shapiro 的 "A comprehensive study of CRDTs"
- Canvas API：MDN Canvas 教程

### 面试向阅读
- Martin Kleppmann 的 CRDT 相关 talks/papers（Automerge 作者，面试谈到 CRDT 必提）
- Figma 的技术博客（他们用的是自研 CRDT，面试会被问"你和 Figma 的实现有什么区别"）

---

## 八、风险与应对

| 风险 | 概率 | 应对策略 |
|------|------|---------|
| Canvas 渲染引擎开发超时 | 中 | Week 1 若进度落后，降级为 SVG 渲染（DOM 操作更简单） |
| Yjs 同步出现诡异 bug | 中 | 善用 Yjs 的 Y.Doc.on('update') 调试；查阅 Yjs Discussion |
| WebSocket 部署环境问题 | 低 | Railway/Fly.io 都原生支持 WebSocket，备选 Render |
| 一个月做不完 P1 功能 | 中 | P0 功能已经足够面试使用，P1 是锦上添花 |
| 面试官问到不会的深度问题 | 高 | 诚实说"这个我还没深入研究但我的理解是..."，并展示学习思路 |
