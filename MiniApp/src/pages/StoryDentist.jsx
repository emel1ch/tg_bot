import React from 'react'
import Slider from '../components/Slider'
import { dentistSocialStory } from '../data/dentistSocialStory'

const STORY_UI = {
  header: {
    topGap: 12,
    sidePadding: 0,
    minHeight: 68,
    backButton: {
      size: 48,
      iconSize: 24,
      x: 0,
      y: 8,
      left: 0,
      top: 0,
    },
    sectionTag: {
      minWidth: 148,
      height: 44,
      x: 0,
      y: 8,
      fontSize: 17,
      paddingX: 22,
      paddingY: 10,
    },
  },
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
            <div
              className="relative w-full"
              style={{
                minHeight: `${STORY_UI.header.minHeight}px`,
                paddingTop: `${STORY_UI.header.topGap}px`,
                paddingLeft: `${STORY_UI.header.sidePadding}px`,
                paddingRight: `${STORY_UI.header.sidePadding}px`,
              }}
            >
              <button
                type="button"
                onClick={onBack}
                aria-label="Назад"
                className="absolute z-20 flex items-center justify-center rounded-full bg-[#D7F2F0] transition active:scale-95"
                style={{
                  width: `${STORY_UI.header.backButton.size}px`,
                  height: `${STORY_UI.header.backButton.size}px`,
                  left: `${STORY_UI.header.backButton.left}px`,
                  top: `${STORY_UI.header.backButton.top}px`,
                  transform: `translate(${STORY_UI.header.backButton.x}px, ${STORY_UI.header.backButton.y}px)`,
                  border: 'none',
                  boxShadow: 'none',
                }}
              >
                <span
                  className="leading-none"
                  style={{
                    fontSize: `${STORY_UI.header.backButton.iconSize}px`,
                    color: '#0F172A',
                  }}
                >
                  ←
                </span>
              </button>

              <div
                className="absolute left-1/2 top-0 inline-flex items-center justify-center rounded-full bg-[#18C6C8]"
                style={{
                  minWidth: `${STORY_UI.header.sectionTag.minWidth}px`,
                  height: `${STORY_UI.header.sectionTag.height}px`,
                  paddingLeft: `${STORY_UI.header.sectionTag.paddingX}px`,
                  paddingRight: `${STORY_UI.header.sectionTag.paddingX}px`,
                  paddingTop: `${STORY_UI.header.sectionTag.paddingY}px`,
                  paddingBottom: `${STORY_UI.header.sectionTag.paddingY}px`,
                  fontSize: `${STORY_UI.header.sectionTag.fontSize}px`,
                  transform: `translate(-50%, 0) translate(${STORY_UI.header.sectionTag.x}px, ${STORY_UI.header.sectionTag.y}px)`,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}
              >
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
                className="text-center font-bold tracking-tight text-slate-900 whitespace-nowrap"
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