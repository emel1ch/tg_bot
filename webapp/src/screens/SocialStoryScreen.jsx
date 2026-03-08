import { useState } from 'react'

function SocialStoryScreen({ direction, onBack }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = direction.story || []

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const goPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  if (!slides.length) {
    return (
      <div className="screen">
        <p>Социальная история пока не добавлена.</p>
        <button className="btn btn--outline" onClick={onBack}>Назад</button>
      </div>
    )
  }

  const slide = slides[currentSlide]

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div className="header">
        <button className="header__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="header__pill">{direction.title}</div>
      </div>

      <h2 className="menu__title" style={{ marginBottom: 16 }}>
        Социстория "{direction.title}"
      </h2>

      {/* Иллюстрация слайда */}
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, #e0f2f1, #b2dfdb)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 64,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {slide.image ? (
          <img
            src={slide.image}
            alt={slide.text}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{direction.id === 'dentist' ? '🦷' : '💉'}</span>
        )}

        {/* Индикатор слайдов */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600
        }}>
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Текст слайда */}
      <div style={{
        background: 'var(--color-primary-light)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        fontSize: 16,
        lineHeight: 1.6,
        color: 'var(--color-text)',
        minHeight: 80,
        marginBottom: 16
      }}>
        {slide.text}
      </div>

      {/* Навигация */}
      <div className="nav-bottom mt-auto">
        <button
          className="btn btn--outline"
          onClick={goPrev}
          disabled={currentSlide === 0}
          style={{ opacity: currentSlide === 0 ? 0.4 : 1 }}
        >
          ‹ Назад
        </button>

        {currentSlide < slides.length - 1 ? (
          <button className="btn btn--primary" onClick={goNext}>
            Вперёд ›
          </button>
        ) : (
          <button className="btn btn--primary" onClick={onBack}>
            Готово ✓
          </button>
        )}
      </div>
    </div>
  )
}

export default SocialStoryScreen
