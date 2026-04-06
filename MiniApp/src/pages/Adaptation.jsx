// webapp/src/pages/Adaptation.jsx
import React from 'react';

function VideoIcon({ width = 24, height = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="6.5" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 10L19.5 7.2V16.8L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon({ width = 24, height = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 5.5H11.5C12.6 5.5 13.5 6.4 13.5 7.5V18.5C13.5 17.4 12.6 16.5 11.5 16.5H5.5V5.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18.5 5.5H12.5C11.4 5.5 10.5 6.4 10.5 7.5V18.5C10.5 17.4 11.4 16.5 12.5 16.5H18.5V5.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// Джойстик — теперь выглядит ТОЧНО как на первом скриншоте (современный геймпад)
function JoystickIcon({ width = 32, height = 32 }) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Основное тело контроллера */}
      <path 
        d="M7.5 8.5C5.84315 8.5 4.5 9.84315 4.5 11.5V14.5C4.5 16.1569 5.84315 17.5 7.5 17.5H16.5C18.1569 17.5 19.5 16.1569 19.5 14.5V11.5C19.5 9.84315 18.1569 8.5 16.5 8.5H7.5Z" 
        stroke="currentColor" 
        strokeWidth="1.6" 
        strokeLinejoin="round"
      />
      
      {/* Нижние ручки (grips) */}
      <path 
        d="M8.5 17.5C8 17.5 7.5 18 7.5 18.5V19.5C7.5 20.6046 8.39543 21.5 9.5 21.5H14.5C15.6046 21.5 16.5 20.6046 16.5 19.5V18.5C16.5 18 16 17.5 15.5 17.5" 
        stroke="currentColor" 
        strokeWidth="1.6" 
        strokeLinejoin="round"
      />

      {/* D-pad (крест слева) */}
      <rect x="6.8" y="11.2" width="4" height="1.1" rx="0.2" fill="currentColor" />
      <rect x="7.8" y="10.3" width="1.1" height="4" rx="0.2" fill="currentColor" />

      {/* Кнопки действия справа (4 кнопки в ромбе) */}
      <circle cx="15.5" cy="12.2" r="0.95" fill="currentColor"/>
      <circle cx="17.2" cy="13.7" r="0.95" fill="currentColor"/>
      <circle cx="15.5" cy="15.2" r="0.95" fill="currentColor"/>
      <circle cx="13.8" cy="13.7" r="0.95" fill="currentColor"/>
    </svg>
  );
}

function ClockIcon({ width = 16, height = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.8V12.2L15 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon({ width = 18, height = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ width = 16, height = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 9.5L15 12L11 14.5V9.5Z" fill="currentColor" />
    </svg>
  );
}

function PdfIcon({ width = 48, height = 48 }) {
  return (
    <div style={{ width: width, height: height, backgroundColor: '#3B82F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <svg viewBox="0 0 24 24" width={width * 0.5} height={height * 0.5} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C5.5 2 5 2.5 5 3V21C5 21.5 5.5 22 6 22H18C18.5 22 19 21.5 19 21V7L14 2Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 2V7H19" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 15H15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 18H13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function Adaptation({ onNavigate, onBack }) {
  const RUTUBE_URL = 'https://rutube.ru/video/private/ed02a8fd70e1c94fc4757ce31bb84bcc/?p=tPToE79p2R8lRMYapilT0Q';
  const GAME_URL = 'https://example.com/your-game';

  const handleLinkClick = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const materials = [
    {
      kind: 'video',
      title: 'Мультфильм',
      subtitle: 'Иду к стоматологу',
      desc: 'Пошаговое объяснение ребенку хода процедуры',
      time: '4 мин',
      icon: <VideoIcon width={28} height={28} />,
      onClick: () => handleLinkClick(RUTUBE_URL),
      bgColor: 'white',
    },
    {
      kind: 'story',
      title: 'Социальная история',
      subtitle: 'Иду к стоматологу',
      desc: 'Пошаговое объяснение ребенку хода процедуры',
      time: '4 мин',
      icon: <BookIcon width={28} height={28} />,
      onClick: () => onNavigate('story'),
      bgColor: 'white',
    },
    {
      kind: 'game',
      title: 'Игра-тренажёр',
      subtitle: 'Иду к стоматологу',
      desc: 'Закрепление полученных навыков в игровую практику',
      time: '4 мин',
      icon: <JoystickIcon width={32} height={32} />,
      onClick: () => handleLinkClick(GAME_URL),
      bgColor: 'white',
    },
    {
      kind: 'info',
      title: 'Рекомендации для родителей',
      subtitle: 'Подготовка к стоматологической помощи детей с РАС',
      desc: 'Полные методические рекомендации по',
      time: 'PDF',
      icon: <PdfIcon width={48} height={48} />,
      onClick: () => onNavigate('info'),
      bgColor: '#FFFDF0',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#FFFEFA', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={onBack}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#D9FBF7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Назад"
          >
            <BackIcon />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Иду к врачу</h1>
            <span style={{ fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '9999px' }}>bot</span>
          </div>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginTop: '8px', marginBottom: '4px' }}>Поход к стоматологу</h2>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280', marginTop: '0', marginBottom: '20px' }}>Материалы для адаптации</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {materials.map((item) => (
            <div
              key={item.kind}
              style={{
                backgroundColor: item.bgColor,
                borderRadius: '22px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '18px',
                    backgroundColor: item.kind === 'info' ? 'transparent' : '#EEFDFD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#11B8C5',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>{item.title}</div>
                  <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '2px' }}>{item.subtitle}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>{item.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: '#9ca3af' }}>
                    <ClockIcon />
                    <span style={{ fontSize: '12px' }}>{item.time}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={item.onClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#3B82F6',
                    borderRadius: '9999px',
                    padding: '6px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <PlayIcon />
                  Начать
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}