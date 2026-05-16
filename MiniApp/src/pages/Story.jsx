import React from 'react'
import Slider from '../components/Slider'
import BackArrowIcon from '../components/BackArrowIcon'
import { bloodSlides } from '../data/bloodSlides'

const STORY_UI = {
  title: {
    fontSize: 22,
    marginTop: -17,
    x: 0,
    y: 10,
  },
}

export default function Story({ onBack }) {
  return (
    <div style={{ height: '100dvh', width: '100%', backgroundColor: '#FFFEFA', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Шапка — не скроллится */}
        <div style={{ flexShrink: 0, padding: '20px 16px 16px' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={onBack}
                aria-label="Назад"
                className="ui-back-circle"
              >
                <BackArrowIcon />
              </button>

              <div className="ui-pill-title whitespace-nowrap">
                Сдача крови
              </div>
            </div>
          </div>
        </div>

        {/* Прокручиваемая область */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 0 24px',
          }}
        >
          <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>
            <h1
              className="text-center font-bold tracking-tight text-slate-900"
              style={{
                fontSize: `${STORY_UI.title.fontSize}px`,
                transform: `translate(${STORY_UI.title.x}px, ${STORY_UI.title.y}px)`,
                marginTop: `${STORY_UI.title.marginTop}px`,
              }}
            >
              Социстория “Сдача крови”
            </h1>

            <div className="mt-6 flex flex-1 min-h-0 flex-col">
              <Slider slides={bloodSlides} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
