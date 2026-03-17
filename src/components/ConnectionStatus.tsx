'use client'

import type { ConnectionStatus as Status } from '@/collaboration/YjsProvider'

interface ConnectionStatusProps {
  status: Status
}

const statusConfig: Record<Status, { label: string; dotColor: string }> = {
  connected: { label: 'Connected', dotColor: 'bg-green-400' },
  connecting: { label: 'Connecting...', dotColor: 'bg-yellow-400' },
  disconnected: { label: 'Offline', dotColor: 'bg-red-400' },
}

export default function ConnectionStatusComponent({ status }: ConnectionStatusProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm px-2.5 py-1.5 text-xs text-gray-500 shadow-sm border border-gray-200/80">
      <span className={`inline-block w-2 h-2 rounded-full ${config.dotColor} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      {config.label}
    </div>
  )
}
