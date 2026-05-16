import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const MotionDiv = motion.div

const windowVariants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.998,
  },
}

export default function AppWindow({ children }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="min-h-screen w-full bg-white">{children}</div>
  }

  return (
    <MotionDiv
      className="min-h-screen w-full bg-white"
      variants={windowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </MotionDiv>
  )
}
