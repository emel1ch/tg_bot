// src/pages/Adaptation.jsx
import React from 'react';

// ----- Иконки -----
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

function JoystickIcon({ width = 32, height = 32 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 190" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="38" y="65" width="124" height="78" rx="24" fill="#E0F7FA" stroke="#18C6C8" strokeWidth="16" />
      <rect x="68" y="82" width="18" height="32" rx="4" fill="#18C6C8" />
      <rect x="78" y="72" width="32" height="16" rx="4" fill="#18C6C8" />
      <circle cx="128" cy="88" r="11" fill="#18C6C8" />
      <circle cx="150" cy="105" r="11" fill="#18C6C8" />
      <rect x="80" y="42" width="40" height="26" rx="9" fill="#18C6C8" />
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

// Иконка-листочек без собственного фона.
function DocIcon({ width = 28, height = 28 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C5.5 2 5 2.5 5 3V21C5 21.5 5.5 22 6 22H18C18.5 22 19 21.5 19 21V7L14 2Z" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M14 2V7H19" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9 15H15" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 18H13" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function Adaptation({ onNavigate, onBack }) {
  const RUTUBE_URL = 'https://rutube.ru/video/private/ed02a8fd70e1c94fc4757ce31bb84bcc/?p=tPToE79p2R8lRMYapilT0Q';
  const GAME_URL = 'https://example.com/your-game';

  const handleLinkClick = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
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
      isSpecial: false,
    },
    {
      kind: 'story',
      title: 'Социальная история',
      subtitle: 'Иду к стоматологу',
      desc: 'Пошаговое объяснение ребенку хода процедуры',
      time: '4 мин',
      icon: <BookIcon width={28} height={28} />,
      onClick: () => onNavigate('story-dentist'),
      isSpecial: false,
    },
    {
      kind: 'game',
      title: 'Игра-тренажёр',
      subtitle: 'Иду к стоматологу',
      desc: 'Закрепление полученных навыков в игровую практику',
      time: '4 мин',
      icon: <JoystickIcon width={32} height={32} />,
      onClick: () => handleLinkClick(GAME_URL),
      isSpecial: false,
    },
    {
      kind: 'info',
      title: 'Рекомендации для родителей',
      subtitle: 'Подготовка к стоматологической помощи детей с РАС',
      desc: 'Полные методические рекомендации по подготовке ребенка к визиту к стоматологу: общие советы и специальные приемы',
      icon: <DocIcon width={28} height={28} />,
      onClick: () => onNavigate('recommendations-dentist'),
      isSpecial: true,
    },
  ];

  const primaryColor = '#18C6C8';
  const specialBorderColor = '#CCFFEE';
  const specialBgColor = 'rgba(140, 210, 70, 0.02)';

  return (
    <div style={{ height: '100dvh', width: '100%', backgroundColor: '#FFFEFA', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Шапка — не скроллится */}
        <div style={{ flexShrink: 0, padding: '20px 16px 16px' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={onBack}
                type="button"
                aria-label="Назад"
                className="ui-back-circle"
              >
                <BackIcon />
              </button>

              <div className="ui-pill-title">
                Поход к стоматологу
              </div>
            </div>
          </div>
        </div>

        {/* Прокручиваемая область на всю ширину экрана */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 0 24px',
          }}
        >
          <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>
            <h3 style={{ fontSize: '19px', fontWeight: '700', color: '#1f2937', marginTop: '4px', marginBottom: '20px' }}>
              Материалы для адаптации
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {materials.map((item) => (
                <div
                  key={item.kind}
                  style={{
                    backgroundColor: item.isSpecial ? specialBgColor : '#FFFFFF',
                    borderRadius: '22px',
                    border: item.isSpecial ? `2px solid ${specialBorderColor}` : `2px solid ${primaryColor}`,
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '18px',
                        backgroundColor: item.isSpecial ? primaryColor : '#EEFDFD',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.isSpecial ? '#ffffff' : primaryColor,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: primaryColor }}>{item.title}</div>
                      <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '2px', fontWeight: '600' }}>{item.subtitle}</div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>{item.desc}</div>

                      {item.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: '#9ca3af' }}>
                          <ClockIcon />
                          <span style={{ fontSize: '12px' }}>{item.time}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      onClick={item.onClick}
                      type="button"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: primaryColor,
                        borderRadius: '9999px',
                        padding: '8px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {item.kind === 'info' ? (
                        <>
                          <BookIcon width={16} height={16} />
                          Открыть
                        </>
                      ) : (
                        <>
                          <PlayIcon />
                          Начать
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
