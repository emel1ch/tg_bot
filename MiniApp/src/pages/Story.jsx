// webapp/src/pages/Story.jsx
import React from 'react'
import Slider from '../components/Slider'

const slides = [
  { image: '', text: 'Страница 1: Введение' },
  { image: '', text: 'Страница 2: Сюжет' },
  { image: '', text: 'Страница 3: Заключение' }
]

export default function Story({ onBack }) {
  return (
    <div>
      <button onClick={onBack}>Назад</button>
      <h2>Соци-история</h2>
      <Slider slides={slides} />
    </div>
  )
}