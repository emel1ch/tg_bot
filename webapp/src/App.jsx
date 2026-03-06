import { useState, useEffect } from 'react'
import WelcomeScreen from './screens/WelcomeScreen'
import MenuScreen from './screens/MenuScreen'
import MaterialsScreen from './screens/MaterialsScreen'
import SocialStoryScreen from './screens/SocialStoryScreen'

// Данные направлений (позже можно подгрузить с сервера)
const DIRECTIONS = [
  {
    id: 'dentist',
    title: 'Поход к стоматологу',
    description: 'Подготовка к визиту стоматолога',
    icon: '🦷',
    materialsCount: 4,
    price: 69,
    purchased: false,
    materials: [
      { id: 'm1', type: 'video', title: 'Мультфильм', subtitle: 'Иду к стоматологу', description: 'Пошаговое объяснение ребенку хода процедуры', duration: '4 мин', icon: '🎬', link: 'https://rutube.ru' },
      { id: 'm2', type: 'story', title: 'Социальная история', subtitle: 'Иду к стоматологу', description: 'Пошаговое объяснение ребенку хода процедуры', duration: '4 мин', icon: '📗' },
      { id: 'm3', type: 'game', title: 'Игра-тренажёр', subtitle: 'Иду к стоматологу', description: 'Закрепление полученных навыков через игровую практику', duration: '4 мин', icon: '🎮', link: 'https://example.com/game' },
      { id: 'm4', type: 'recommendations', title: 'Рекомендации для родителей', subtitle: 'Подготовка к стоматологической помощи детей с РАС', description: 'Полные методические рекомендации по подготовке', icon: '📄' }
    ],
    story: [
      { image: null, text: 'Я иду в стоматологию, чтобы врач проверил мои зубки.' },
      { image: null, text: 'Когда я приду в стоматологию, я надену бахилы.' },
      { image: null, text: 'В кабинете врача я сяду в специальное кресло.' },
      { image: null, text: 'Врач попросит меня открыть рот и посмотрит мои зубки.' },
      { image: null, text: 'Это совсем не больно! Врач очень аккуратный.' },
      { image: null, text: 'После осмотра врач скажет, что мои зубки здоровы!' }
    ]
  },
  {
    id: 'blood',
    title: 'Сдача анализа крови',
    description: 'Подготовка к процедуре забора крови',
    icon: '💉',
    materialsCount: 3,
    price: null,
    purchased: true,
    materials: [
      { id: 'b1', type: 'video', title: 'Мультфильм', subtitle: 'Иду сдавать кровь из вены', description: 'Пошаговое объяснение ребенку хода процедуры', duration: '4 мин', icon: '🎬', link: 'https://rutube.ru' },
      { id: 'b2', type: 'story', title: 'Социальная история', subtitle: 'Иду сдавать кровь из вены', description: 'Пошаговое объяснение ребенку хода процедуры', duration: '4 мин', icon: '📗' },
      { id: 'b3', type: 'game', title: 'Игра-тренажёр', subtitle: 'Иду сдавать кровь из вены', description: 'Закрепление полученных навыков через игровую практику', duration: '4 мин', icon: '🎮', link: 'https://example.com/game' }
    ],
    story: [
      { image: null, text: 'Сегодня я иду в лабораторию сдавать кровь из вены.' },
      { image: null, text: 'Медсестра попросит меня сесть и положить руку на стол.' },
      { image: null, text: 'Она перевяжет мою руку мягкой лентой.' },
      { image: null, text: 'Будет небольшой укол — как комарик укусит.' },
      { image: null, text: 'Потом наклеят пластырь, и всё готово!' }
    ]
  }
]

function App() {
  const [screen, setScreen] = useState('welcome')
  const [currentDirection, setCurrentDirection] = useState(null)
  const [directions, setDirections] = useState(DIRECTIONS)

  useEffect(() => {
    // Инициализация Telegram WebApp
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()

      // Применяем цвета темы Telegram
      document.documentElement.style.setProperty(
        '--tg-bg', tg.themeParams?.bg_color || '#FDF6F0'
      )
    }
  }, [])

  const navigate = (screenName, directionId = null) => {
    if (directionId) {
      setCurrentDirection(directions.find(d => d.id === directionId))
    }
    setScreen(screenName)
  }

  const handlePurchase = (directionId) => {
    // Заглушка покупки — просто помечаем как купленное
    setDirections(prev =>
      prev.map(d => d.id === directionId ? { ...d, purchased: true } : d)
    )
  }

  const goBack = () => {
    if (screen === 'story') {
      navigate('materials', currentDirection?.id)
    } else if (screen === 'materials') {
      navigate('menu')
    } else if (screen === 'menu') {
      navigate('welcome')
    }
  }

  return (
    <div className="app">
      {screen === 'welcome' && (
        <WelcomeScreen onStart={() => navigate('menu')} />
      )}

      {screen === 'menu' && (
        <MenuScreen
          directions={directions}
          onSelectDirection={(id) => navigate('materials', id)}
          onPurchase={handlePurchase}
          onBack={goBack}
        />
      )}

      {screen === 'materials' && currentDirection && (
        <MaterialsScreen
          direction={currentDirection}
          onBack={goBack}
          onOpenStory={() => navigate('story')}
        />
      )}

      {screen === 'story' && currentDirection && (
        <SocialStoryScreen
          direction={currentDirection}
          onBack={goBack}
        />
      )}
    </div>
  )
}

export default App
