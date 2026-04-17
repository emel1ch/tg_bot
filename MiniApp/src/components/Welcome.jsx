import React, { useEffect, useRef, useState } from 'react'
import welcomeImg from '../assets/welcome.png'
import bottomWelcomeImg from '../assets/Logo.png'

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
  bottomImageSrc = bottomWelcomeImg,
  bottomImageAlt = 'Иду к врачу',
  bottomImageClass = 'w-full max-w-[110px] h-auto object-contain mt-10',
  bottomImageStyle = {},
  titleClass = 'text-3xl sm:text-3xl font-semibold tracking-tight text-[#0E7490] mb-3',
  subtitleClass = 'text-sm text-[#4B6F6D]',
  containerClass = 'min-h-screen overflow-hidden flex items-center justify-center bg-[#FFFEFA] px-4',
  containerStyle = {},
  leftBubbleStyle = {},
  rightBubbleStyle = {},
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

  const leftCircle = {
    left: '-7rem',
    top: '8rem',
    width: '16rem',
    height: '16rem',
    opacity: 0.28,
    ...leftBubbleStyle,
  }

  const rightCircle = {
    right: '-15.5rem',
    bottom: '-6rem',
    width: '33rem',
    height: '33rem',
    opacity: 0.24,
    ...rightBubbleStyle,
  }

  return (
    <div className={`${containerClass} relative isolate`} style={containerStyle}>
      <div
        className="pointer-events-none absolute z-0 rounded-full bg-[#A8E6E1] blur-[0.5px]"
        style={leftCircle}
      />
      <div
        className="pointer-events-none absolute z-0 rounded-full bg-[#A8E6E1] blur-[0.5px]"
        style={rightCircle}
      />

      <div
        className={`relative z-10 w-full max-w-3xl text-center ${fly ? 'fly-up' : ''}`}
        style={animationVar}
      >
        {titlePosition === 'top' && <h1 className={titleClass}>{titleText}</h1>}

        {subtitlePosition === 'top' && (
          <div className={subtitleClass}>{subtitleText}</div>
        )}

        <div className="my-5 flex justify-center">
          <img
            src={welcomeImg}
            alt="welcome"
            className={imgClass}
            style={imgStyle}
          />
        </div>

        <div className="my-3 flex justify-center">
          <img
            src={bottomImageSrc}
            alt={bottomImageAlt}
            className={bottomImageClass}
            style={bottomImageStyle}
          />
        </div>

        {titlePosition === 'bottom' && <h1 className={titleClass}>{titleText}</h1>}

        {subtitlePosition === 'bottom' && !bottomImageSrc && (
          <div className={subtitleClass}>{subtitleText}</div>
        )}
      </div>
    </div>
  )
}