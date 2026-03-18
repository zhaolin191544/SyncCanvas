'use client'

import type { RemoteUser } from '@/collaboration/useAwareness'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div className="absolute top-6 right-86 z-50 flex items-center -space-x-2">
      <AnimatePresence>
        {allUsers.map((user, i) => (
          <motion.div
            key={`${user.name}-${i}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -2, zIndex: 50 }}
            className="relative flex items-center justify-center w-8 h-8 rounded-full text-white text-[10px] font-bold shadow-sm ring-2 ring-[#fdfdfc] transition-all cursor-default overflow-hidden group"
            style={{ backgroundColor: user.color, zIndex: 10 - i }}
          >
            <span className="uppercase">{user.name.charAt(0)}</span>
            
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-stone-900 text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {user.name} {user.isLocal && '(You)'}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
