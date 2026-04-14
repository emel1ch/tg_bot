// webapp/src/App.jsx
import React, { useEffect, useRef, useState } from 'react'
import Welcome from './components/Welcome'
import Home from './pages/Home'
import Adaptation from './pages/Adaptation'
import Recommendations from './pages/Recommendations'
import Story from './pages/Story'
import PaySheetDentist from './components/PaySheetDentist'

import AdaptationDentist from './pages/AdaptationDentist'
import StoryDentist from './pages/StoryDentist'
import GameLinkDentist from './pages/GameLinkDentist'
import VideoPlayerDentist from './pages/VideoPlayerDentist'
import RecommendationsDentist from './pages/RecommendationsDentist'

import { DENTIST_PROMOS } from './data/dentistConfig'

export default function App() {
  const [route, setRoute] = useState('welcome')
  const [isDentistPayOpen, setIsDentistPayOpen] = useState(false)

  // Временный режим для тестов:
  // доступ к стоматологу всегда закрыт после обновления страницы.
  const [dentistUnlocked, setDentistUnlocked] = useState(false)

  // Старая версия с сохранением доступа между обновлениями:
  /*
  const [dentistUnlocked, setDentistUnlocked] = useState(() => {
    try {
      return localStorage.getItem(DENTIST_ACCESS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(DENTIST_ACCESS_KEY, dentistUnlocked ? '1' : '0')
    } catch {
      // ignore storage errors
    }
  }, [dentistUnlocked])
  */

  const [toastVisible, setToastVisible] = useState(false)
  const [toastPhase, setToastPhase] = useState('hidden') // hidden | enter | exit

  const toastHideTimerRef = useRef(null)
  const toastUnmountTimerRef = useRef(null)

  const clearToastTimers = () => {
    if (toastHideTimerRef.current) {
      window.clearTimeout(toastHideTimerRef.current)
      toastHideTimerRef.current = null
    }

    if (toastUnmountTimerRef.current) {
      window.clearTimeout(toastUnmountTimerRef.current)
      toastUnmountTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearToastTimers()
    }
  }, [])

  const showSuccessToast = () => {
    clearToastTimers()

    setToastVisible(true)
    setToastPhase('enter')

    toastHideTimerRef.current = window.setTimeout(() => {
      setToastPhase('exit')
    }, 5000)

    toastUnmountTimerRef.current = window.setTimeout(() => {
      setToastVisible(false)
      setToastPhase('hidden')
    }, 5700)
  }

  const unlockDentist = () => {
    setDentistUnlocked(true)
    setIsDentistPayOpen(false)
    showSuccessToast()
  }

  const navigate = (to) => setRoute(to)

  const handlePromoApply = (value) => {
    const normalized = value.trim().toUpperCase()

    if (DENTIST_PROMOS.includes(normalized)) {
      unlockDentist()
      return { ok: true, message: 'Промокод принят' }
    }

    return { ok: false, message: 'Промокод не подошёл' }
  }

  const handleFuturePay = () => {
    return { ok: true, message: 'Оплата прошла успешно' }
  }

  if (route === 'welcome') {
    return (
      <Welcome
        onFinish={() => setRoute('home')}
        duration={4000}
        flyDuration={2000}
      />
    )
  }

  return (
    <>
      <div className="min-h-screen w-full bg-white">
        {route === 'home' && (
          <Home
            onNavigate={navigate}
            onOpenDentistPay={() => setIsDentistPayOpen(true)}
            dentistUnlocked={dentistUnlocked}
          />
        )}

        {route === 'adaptation' && (
          <Adaptation onNavigate={navigate} onBack={() => setRoute('home')} />
        )}

        {route === 'adaptation-dentist' && (
          <AdaptationDentist
            onNavigate={navigate}
            onBack={() => setRoute('home')}
          />
        )}

        {route === 'story' && <Story onBack={() => setRoute('adaptation')} />}

        {route === 'info' && (
          <Recommendations onBack={() => setRoute('adaptation')} />
        )}

        {route === 'story-dentist' && (
          <StoryDentist onBack={() => setRoute('adaptation-dentist')} />
        )}

        {route === 'game-dentist' && (
          <GameLinkDentist onBack={() => setRoute('adaptation-dentist')} />
        )}

        {route === 'video-dentist' && (
          <VideoPlayerDentist onBack={() => setRoute('adaptation-dentist')} />
        )}

        {route === 'recommendations-dentist' && (
          <RecommendationsDentist onBack={() => setRoute('adaptation-dentist')} />
        )}

        <PaySheetDentist
          isOpen={isDentistPayOpen}
          onClose={() => setIsDentistPayOpen(false)}
          onApplyPromo={handlePromoApply}
          onPay={handleFuturePay}
          onSuccess={unlockDentist}
        />
      </div>

      {toastVisible ? (
        <div
          className="fixed right-4 z-50 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
          style={{
            top: '50%',
            animation:
              toastPhase === 'enter'
                ? 'dentistToastIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both'
                : 'dentistToastOut 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
          aria-live="polite"
        >
          Оплата прошла успешно
        </div>
      ) : null}

      <style>{`
        @keyframes dentistToastIn {
          from {
            transform: translate3d(120%, -50%, 0);
            opacity: 0;
          }
          to {
            transform: translate3d(0, -50%, 0);
            opacity: 1;
          }
        }

        @keyframes dentistToastOut {
          0% {
            transform: translate3d(0, -50%, 0);
            opacity: 1;
          }
          30% {
            transform: translate3d(-8px, -50%, 0);
            opacity: 1;
          }
          60% {
            transform: translate3d(6px, -50%, 0);
            opacity: 1;
          }
          100% {
            transform: translate3d(120%, -50%, 0);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}