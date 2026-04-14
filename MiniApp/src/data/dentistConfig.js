// src/data/dentistConfig.js

export const DENTIST_ACCESS_KEY = 'dentist-access-v1'
export const DENTIST_PRICE = 69

// Временно. Потом это будет проверяться на сервере.
export const DENTIST_PROMOS = ['DENTISTFREE']

export const DENTIST_GAME_URL = 'https://example.com'
export const DENTIST_VIDEO_URL = 'https://example.com'

export const DENTIST_MATERIALS = [
  {
    id: 'story',
    title: 'Социальная история',
    description: 'Открывает страницу с карточками',
    route: 'story-dentist',
  },
  {
    id: 'game',
    title: 'Игра',
    description: 'Переход на внешний сайт',
    route: 'game-dentist',
  },
  {
    id: 'video',
    title: 'Видео',
    description: 'Переход на внешний сайт',
    route: 'video-dentist',
  },
  {
    id: 'info',
    title: 'Рекомендации для родителей',
    description: 'Страница с описанием и PDF',
    route: 'recommendations-dentist',
  },
]