// webapp/src/App.jsx
import React, { useState } from 'react'
import Home from './pages/Home'
import VideoPlayer from './pages/VideoPlayer'
import Story from './pages/Story'
import PayPage from './pages/PayPage'
import GameLink from './pages/GameLink'

export default function App() {
  const [route, setRoute] = useState('home')
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ') // demo

  const navigate = (to, params) => {
    if (to === 'video' && params?.videoId) setVideoId(params.videoId)
    setRoute(to)
  }

  return (
    <div className="container">
      {route === 'home' && <Home onNavigate={navigate} />}
      {route === 'video' && <VideoPlayer videoId={videoId} onBack={() => setRoute('home')} />}
      {route === 'story' && <Story onBack={() => setRoute('home')} />}
      {route === 'dentist-paid' && <PayPage onBack={() => setRoute('home')} />}
      {route === 'game' && <GameLink onBack={() => setRoute('home')} />}
    </div>
  )
} 