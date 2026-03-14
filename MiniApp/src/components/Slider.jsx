// webapp/src/components/Slider.jsx
import React, { useState } from 'react'

export default function Slider({ slides = [] }) {
  const [i, setI] = useState(0)
  const next = () => setI(s => Math.min(s + 1, slides.length - 1))
  const prev = () => setI(s => Math.max(s - 1, 0))

  if (!slides || slides.length === 0) {
    return <div style={{ padding: 12 }}>Нет слайдов</div>
  }

  return (
    <div>
      <div style={{ minHeight: 180, border: '1px solid #ccc', padding: 12, background:'#fff' }}>
        {slides[i].image ? <img src={slides[i].image} alt="" style={{ width: '100%' }} /> : null}
        <p>{slides[i].text}</p>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={prev} disabled={i === 0}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>{i + 1} / {slides.length}</div>
        <button onClick={next} disabled={i === slides.length - 1}>→</button>
      </div>
    </div>
  )
}