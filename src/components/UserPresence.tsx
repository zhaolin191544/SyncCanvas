'use client'

import type { RemoteUser } from '@/collaboration/useAwareness'

interface UserPresenceProps {
  localUser: { name: string; color: string }
  remoteUsers: RemoteUser[]
}

export default function UserPresence({ localUser, remoteUsers }: UserPresenceProps) {
  const allUsers = [
    { name: localUser.name, color: localUser.color, isLocal: true },
    ...remoteUsers.map(u => ({ name: u.name, color: u.color, isLocal: false })),
  ]

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-1">
      {allUsers.map((user, i) => (
        <div
          key={i}
          className="relative flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold shadow-sm ring-2 ring-white"
          style={{ backgroundColor: user.color, marginLeft: i > 0 ? '-4px' : '0' }}
          title={`${user.name}${user.isLocal ? ' (you)' : ''}`}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      <span className="ml-2 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm border border-gray-200/80">
        {allUsers.length} online
      </span>
    </div>
  )
}
