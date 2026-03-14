// webapp/src/pages/Home.jsx
import React from 'react'

export default function Home({ onNavigate }) {
  return (
    <div>
      <h1>Меню</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => onNavigate('blood')}>Сдать кровь (бесплатно)</button>
        <button onClick={() => onNavigate('dentist-paid')}>Стоматолог (платно)</button>
        <button onClick={() => onNavigate('video', { videoId: 'dQw4w9WgXcQ' })}>Мультик</button>
        <button onClick={() => onNavigate('story')}>Соци-история</button>
        <button onClick={() => onNavigate('game')}>Играть</button>
      </div>
    </div>
  )
}