'use client'

import { motion, type Variants } from 'framer-motion'
import type { Easing } from 'framer-motion'

export default function SyncLogo({ className = "w-16 h-16" }: { className?: string }) {
  const pathVariants: Variants = {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          duration: 3.5,
          ease: "easeInOut" as Easing,
          repeat: Infinity,
          repeatType: "reverse" as const,
          repeatDelay: 1
        },
        opacity: { duration: 0.5 }
      }
    }
  }

  return (
    <div className={className}>
      <svg
        viewBox="0 0 180 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <motion.path
          d="M 65 35 C 65 20 35 20 35 35 C 35 55 65 45 65 65 C 65 85 35 85 35 70 M 80 50 L 90 80 M 100 50 L 90 80 L 85 95 M 115 80 L 115 55 C 115 42 135 42 135 55 L 135 80 M 170 55 C 170 45 150 45 150 65 C 150 85 170 85 170 75"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={pathVariants}
          initial="initial"
          animate="animate"
        />
      </svg>
    </div>
  )
}
