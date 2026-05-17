import React from 'react'
import { motion } from 'framer-motion'

const MotionDiv = motion.div

const windowVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
}

export default function AppWindow({ children }) {
  return (
    <MotionDiv
      className="min-h-screen w-full bg-white"
      variants={windowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </MotionDiv>
  )
}
