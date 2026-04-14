import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const SLIDER_UI = {
  card: {
    padding: 16,
    radius: 28,
  },
  imageBox: {
    width: 300,
    height: 280,
    radius: 24,
  },
  textBox: {
    width: 300,
    radius: 24,
    marginTop: 16,
    paddingX: 20,
    paddingY: 18,
    fontSize: 16,
    lineHeight: 28,
    borderWidth: 2,
    borderColor: '#8ADFD9',
  },
  buttons: {
    marginTop: 14,
    gap: 14,
    height: 50,
    radius: 20,
    fontSize: 14,
    leftButtonWidth: 0,
    rightButtonWidth: 0,
    arrowGap: 14,
    bottomPadding: 16,
  },
}

export default function Slider({ slides = [] }) {
  const [[index, direction], setIndex] = useState([0, 0])

  const next = () => {
    setIndex(([current]) => {
      if (current >= slides.length - 1) return [current, 0]
      return [current + 1, 1]
    })
  }

  const prev = () => {
    setIndex(([current]) => {
      if (current <= 0) return [current, 0]
      return [current - 1, -1]
    })
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        Нет слайдов
      </div>
    )
  }

  const current = slides[index]

  const cardVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
      scale: 0.98,
    }),
  }

  const MotionDiv = motion.div

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className="overflow-hidden bg-[#FFFEFA]"
        style={{
          borderRadius: `${SLIDER_UI.card.radius}px`,
        }}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <MotionDiv
            key={index}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex flex-col items-center"
            style={{
              padding: `${SLIDER_UI.card.padding}px`,
            }}
          >
            <div
              className="mx-auto overflow-hidden bg-white"
              style={{
                width: `min(100%, ${SLIDER_UI.imageBox.width}px)`,
                height: `${SLIDER_UI.imageBox.height}px`,
                borderRadius: `${SLIDER_UI.imageBox.radius}px`,
              }}
            >
              {current.image ? (
                <img
                  src={current.image}
                  alt=""
                  className="block h-full w-full object-contain"
                  draggable="false"
                />
              ) : null}
            </div>

            <div
              className="mx-auto flex items-center justify-center text-center"
              style={{
                width: `min(100%, ${SLIDER_UI.textBox.width}px)`,
                marginTop: `${SLIDER_UI.textBox.marginTop}px`,
                borderRadius: `${SLIDER_UI.textBox.radius}px`,
                paddingLeft: `${SLIDER_UI.textBox.paddingX}px`,
                paddingRight: `${SLIDER_UI.textBox.paddingX}px`,
                paddingTop: `${SLIDER_UI.textBox.paddingY}px`,
                paddingBottom: `${SLIDER_UI.textBox.paddingY}px`,
                backgroundColor: '#DDF7F6',
                borderStyle: 'solid',
                borderWidth: `${SLIDER_UI.textBox.borderWidth}px`,
                borderColor: SLIDER_UI.textBox.borderColor,
              }}
            >
              <p
                className="whitespace-normal wrap-break-word text-slate-700"
                style={{
                  fontSize: `${SLIDER_UI.textBox.fontSize}px`,
                  lineHeight: `${SLIDER_UI.textBox.lineHeight}px`,
                }}
              >
                {current.text}
              </p>
            </div>
          </MotionDiv>
        </AnimatePresence>
      </div>

      <div className="w-full flex-1" />
      <div className="w-full flex justify-center px-4">
        <div className="w-[95%] h-0.5 bg-[#8ADFD9] opacity-60"></div>
      </div>


      <div
        className="flex items-center justify-between gap-4"
        style={{
          marginTop: `${SLIDER_UI.buttons.marginTop}px`,
          paddingBottom: `max(${SLIDER_UI.buttons.bottomPadding}px, env(safe-area-inset-bottom))`,
        }}
      >
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="rounded-2xl border border-slate-300 bg-white px-4 font-semibold text-slate-700 shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            height: `${SLIDER_UI.buttons.height}px`,
            borderRadius: `${SLIDER_UI.buttons.radius}px`,
            fontSize: `${SLIDER_UI.buttons.fontSize}px`,
            width: SLIDER_UI.buttons.leftButtonWidth
              ? `${SLIDER_UI.buttons.leftButtonWidth}px`
              : '48%',
          }}
        >
          <span className="inline-flex items-center justify-center">
            <span className="text-base leading-none">{'<'}</span>
            <span style={{ marginLeft: `${SLIDER_UI.buttons.arrowGap}px` }}>
              Назад
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={next}
          disabled={index === slides.length - 1}
          className="rounded-2xl bg-[#18C6C8] px-4 font-semibold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            height: `${SLIDER_UI.buttons.height}px`,
            borderRadius: `${SLIDER_UI.buttons.radius}px`,
            fontSize: `${SLIDER_UI.buttons.fontSize}px`,
            width: SLIDER_UI.buttons.rightButtonWidth
              ? `${SLIDER_UI.buttons.rightButtonWidth}px`
              : '48%',
          }}
        >
          <span className="inline-flex items-center justify-center">
            <span style={{ color: '#FFFFFF' }}>Вперед</span>
            <span
              className="text-base leading-none"
              style={{
                marginLeft: `${SLIDER_UI.buttons.arrowGap}px`,
                color: '#FFFFFF',
              }}
            >
              {'>'}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}