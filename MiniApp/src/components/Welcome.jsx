// src/components/Welcome.jsx
import React, { useEffect, useRef, useState } from 'react'
import welcomeImg from '../assets/welcome.png'

export default function Welcome({
  // callback от App: вызывается когда welcome закончился
  onFinish = () => {},

  // текстовые значения (по умолчанию)
  titleText = 'Добро пожаловать!',
  subtitleText = 'Иду к врачу',

  // где показываем (для каждого текста отдельно): 'top' | 'bottom'
  titlePosition = 'top',
  subtitlePosition = 'bottom',

  // тайминги
  duration = 2600,    // общее время на экране (ms)
  flyDuration = 700,  // длительность анимации пролёта (ms)

  // стили/классы (Tailwind / inline)
  imgClass = 'w-full h-[60vh] object-contain',
  imgStyle = {},
  titleClass = 'text-2xl font-semibold mb-3',
  subtitleClass = 'text-sm text-gray-600',
  containerClass = 'h-screen overflow-hidden flex items-center justify-center bg-white',
  containerStyle = {}
}) {
  const [fly, setFly] = useState(false)
  const finishedRef = useRef(false)

  useEffect(() => {
    // когда запускать анимацию пролёта
    const flyDelay = Math.max(0, duration - flyDuration)

    const tFly = setTimeout(() => setFly(true), flyDelay)

    const tEnd = setTimeout(() => {
      // вызываем onFinish ровно 1 раз
      if (!finishedRef.current) {
        finishedRef.current = true
        try {
          onFinish()
        } catch (e) {
          // safety: не ломаем UI, если onFinish бросает
          
          console.error('Welcome: onFinish error', e)
        }
      }
    }, duration)

    return () => {
      clearTimeout(tFly)
      clearTimeout(tEnd)
    }
  }, [duration, flyDuration, onFinish])

  // передаём длительность анимации в CSS-переменную --fly-dur:
  const animationVar = { '--fly-dur': `${flyDuration}ms` }

  return (
    <div className={containerClass} style={containerStyle}>
      <div
        className={`w-full max-w-3xl text-center px-6 ${fly ? 'fly-up' : ''}`}
        style={animationVar}
      >
        {/* Заголовок ABOVE image */}
        {titlePosition === 'top' && <h1 className={titleClass}>{titleText}</h1>}

        {/* Подзаголовок ABOVE image (если нужен) */}
        {subtitlePosition === 'top' && <div className={subtitleClass}>{subtitleText}</div>}

        {/* Картинка */}
        <div className="flex justify-center my-4">
          <img src={welcomeImg} alt="welcome" className={imgClass} style={imgStyle} />
        </div>

        {/* Заголовок BELOW image */}
        {titlePosition === 'bottom' && <h1 className={titleClass}>{titleText}</h1>}

        {/* Подзаголовок BELOW image */}
        {subtitlePosition === 'bottom' && <div className={subtitleClass}>{subtitleText}</div>}
      </div>
    </div>
  )
}