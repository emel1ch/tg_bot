// webapp/src/App.jsx
import React, { useState } from 'react'
import Welcome from './components/Welcome'
import Home from './pages/Home'
import Adaptation from './pages/Adaptation'
import Recommendations from './pages/Recommendations'
import Story from './pages/Story'
import PayPage from './pages/PayPage'

export default function App() {
  const [route, setRoute] = useState('welcome')

  const navigate = (to) => setRoute(to)

  if (route === 'welcome') {
    return (
      <Welcome 
        onFinish={() => setRoute('home')} 
        duration={4000}
        flyDuration={2000}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col items-center min-h-screen bg-white">
      {route === 'home' && <Home onNavigate={navigate} />}
      
      {route === 'adaptation' && (
        <Adaptation onNavigate={navigate} onBack={() => setRoute('home')} />
      )}

      {route === 'dentist-paid' && (
        <PayPage onBack={() => setRoute('home')} />
      )}

      {route === 'story' && (
        <Story onBack={() => setRoute('adaptation')} />
      )}

      {route === 'info' && (
        <Recommendations onBack={() => setRoute('adaptation')} />
      )}
    </div>
  )
}