'use client'

import { useState } from 'react'

const shortcuts = [
  { key: 'V', desc: '选择工具' },
  { key: 'R', desc: '矩形' },
  { key: 'O', desc: '椭圆' },
  { key: 'L', desc: '直线' },
  { key: 'A', desc: '箭头' },
  { key: 'P', desc: '画笔' },
  { key: 'T', desc: '文本' },
  { key: 'E', desc: '橡皮擦' },
  { key: 'Del', desc: '删除选中' },
  { key: 'Ctrl+Z', desc: '撤销' },
  { key: 'Ctrl+Shift+Z', desc: '重做' },
  { key: 'Ctrl+D', desc: '复制元素' },
  { key: 'Ctrl+A', desc: '全选' },
  { key: '双击', desc: '添加文本' },
  { key: '滚轮', desc: '缩放' },
  { key: '中键拖拽', desc: '平移画布' },
]

export default function ShortcutsCard() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="absolute left-4 top-16 z-10">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="rounded-lg bg-white px-2.5 py-1.5 text-xs text-gray-500 shadow border border-gray-200 hover:bg-gray-50 transition-colors"
        title="快捷键"
      >
        {collapsed ? '⌨ 快捷键' : '⌨ 收起'}
      </button>

      {!collapsed && (
        <div className="mt-2 w-48 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
            快捷键
          </div>
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {shortcuts.map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-gray-500">{desc}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-600 rounded border border-gray-200">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
