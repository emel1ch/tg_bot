import React from 'react'
import Slider from '../components/Slider'
import BackArrowIcon from '../components/BackArrowIcon'
import { dentistSocialStory } from '../data/dentistSocialStory'

const STORY_UI = {
  title: {
    fontSize: 21,
    marginTop: -30,
    x: 0,
    y: 4,
  },
}

export default function StoryDentist({ onBack }) {
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
                Поход к стоматологу
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
            <div className="mt-5">
              <h1
                className="text-center font-bold tracking-tight leading-tight text-slate-900"
                style={{
                  fontSize: `${STORY_UI.title.fontSize}px`,
                  transform: `translate(${STORY_UI.title.x}px, ${STORY_UI.title.y}px)`,
                  marginTop: `${STORY_UI.title.marginTop}px`,
                }}
              >
                Социстория “Поход к стоматологу”
              </h1>
            </div>

            <div className="mt-6 flex flex-1 min-h-0 flex-col">
              <Slider slides={dentistSocialStory} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
