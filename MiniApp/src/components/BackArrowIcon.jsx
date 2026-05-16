import React from 'react'
import { ChevronLeft } from 'lucide-react'

export default function BackArrowIcon({ size = 22, className = '' }) {
  return (
    <ChevronLeft
      aria-hidden="true"
      className={`ui-back-arrow ${className}`.trim()}
      size={size}
      strokeWidth={2.4}
    />
  )
}
