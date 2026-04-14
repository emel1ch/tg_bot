import React from 'react'
import Slider from '../components/Slider'
import { bloodSlides } from '../data/bloodSlides'

const STORY_UI = {
  header: {
    topGap: 12,
    sidePadding: 0,
    minHeight: 68,
    backButton: {
      size: 48,
      iconSize: 24,
      x: 0,
      y: 24,
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
    fontSize: 28,
    marginTop: 18,
    x: 0,
    y: 10,
  },
}

export default function Story({ onBack }) {
  return (
    <div className="min-h-dvh w-full bg-[#FFFEFA] px-4 py-5">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
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
            }}
          >
            Сдача крови
          </div>
        </div>

        <h1
          className="mt-5 text-center font-bold tracking-tight text-slate-900"
          style={{
            fontSize: `${STORY_UI.title.fontSize}px`,
            transform: `translate(${STORY_UI.title.x}px, ${STORY_UI.title.y}px)`,
            marginTop: `${STORY_UI.title.marginTop}px`,
          }}
        >
          Социстория “Сдача крови”
        </h1>

        <div className="mt-8.75 flex flex-1 min-h-0 flex-col">
          <Slider slides={bloodSlides} />
        </div>
      </div>
    </div>
  )
}