// webapp/src/pages/GameLink.jsx
import React from 'react'

export default function GameLink({ onBack }) {
  const openGame = () => {
    window.open('https://example.com/your-game', '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <button onClick={onBack}>Назад</button>
      <h2>Игра</h2>
      <p>Нажмите, чтобы открыть игру в новой вкладке.</p>
      <button onClick={openGame}>Открыть игру</button>
    </div>
  )
}