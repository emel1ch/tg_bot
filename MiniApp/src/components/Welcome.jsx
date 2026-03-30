import React, { useEffect, useRef, useState } from 'react'
import welcomeImg from '../assets/welcome.png'

export default function Welcome({
  onFinish = () => {},
  titleText = 'Добро пожаловать!',
  subtitleText = 'Иду к врачу',
  titlePosition = 'top',
  subtitlePosition = 'bottom',
  duration = 2600,
  flyDuration = 700,
  imgClass = 'w-full max-w-md h-[55vh] object-contain',
  imgStyle = {},
  titleClass = 'text-2xl sm:text-3xl font-semibold tracking-tight text-[#1E7F7A] mb-3',
  subtitleClass = 'text-sm text-[#4B6F6D]',
  containerClass = 'min-h-screen overflow-hidden flex items-center justify-center bg-[#FFFEFA] px-4',
  containerStyle = {},
}) {
  const [fly, setFly] = useState(false)
  const finishedRef = useRef(false)

  useEffect(() => {
    const flyDelay = Math.max(0, duration - flyDuration)

    const tFly = setTimeout(() => setFly(true), flyDelay)

    const tEnd = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true
        try {
          onFinish()
        } catch (e) {
          console.error('Welcome: onFinish error', e)
        }
      }
    }, duration)

    return () => {
      clearTimeout(tFly)
      clearTimeout(tEnd)
    }
  }, [duration, flyDuration, onFinish])

  const animationVar = { '--fly-dur': `${flyDuration}ms` }

  return (
    <div className={`${containerClass} relative isolate`} style={containerStyle}>
      <div className="pointer-events-none absolute -left-10 -top-10 z-0 h-28 w-28 rounded-full bg-[#73D8D0] opacity-70 blur-[1px]" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 z-0 h-56 w-56 rounded-full bg-[#5ECFC6] opacity-55 blur-[1px]" />

      <div
        className={`relative z-10 w-full max-w-3xl text-center ${fly ? 'fly-up' : ''}`}
        style={animationVar}
      >
        {titlePosition === 'top' && <h1 className={titleClass}>{titleText}</h1>}

        {subtitlePosition === 'top' && (
          <div className={subtitleClass}>{subtitleText}</div>
        )}

        <div className="my-5 flex justify-center">
          <img src={welcomeImg} alt="welcome" className={imgClass} style={imgStyle} />
        </div>

        {titlePosition === 'bottom' && <h1 className={titleClass}>{titleText}</h1>}

        {subtitlePosition === 'bottom' && (
          <div className={subtitleClass}>{subtitleText}</div>
        )}
      </div>
    </div>
  )
}