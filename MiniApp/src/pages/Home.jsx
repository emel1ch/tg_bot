// src/pages/Home.jsx
import React from 'react';
import ScenarioCard from '../components/ScenarioCard';

// ----- Иконки -----
function ToothIcon({ width = 32, height = 32, style = {} }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" style={style} xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 3.5C6.29 3.5 4.5 5.29 4.5 7.5C4.5 9.18 5.38 10.12 5.98 11.2C6.7 12.5 6.7 14.1 6.7 16.2C6.7 17.57 7.4 20.5 8.8 20.5C10.1 20.5 10.2 17.8 10.8 16.2C11.1 15.4 11.6 14.9 12 14.9C12.4 14.9 12.9 15.4 13.2 16.2C13.8 17.8 13.9 20.5 15.2 20.5C16.6 20.5 17.3 17.57 17.3 16.2C17.3 14.1 17.3 12.5 18.02 11.2C18.62 10.12 19.5 9.18 19.5 7.5C19.5 5.29 17.71 3.5 15.5 3.5C14.1 3.5 12.95 4.16 12 5.1C11.05 4.16 9.9 3.5 8.5 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SyringeIcon({ width = 32, height = 32, style = {} }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} fill="none" style={style} xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 18.5L10 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 20L11.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11.5 15.5L8.5 12.5L14.5 6.5L17.5 9.5L11.5 15.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 5L19 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 4L20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 9.5L21 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.5 6.5L15.8 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.5 12.5L7 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon({ width = 16, height = 16, style = {}, className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={width} height={height} fill="none" style={style} xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5H5L6.2 14.2C6.3 15.1 7.1 15.8 8 15.8H17.8C18.7 15.8 19.5 15.1 19.6 14.2L20.5 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 19.2C8.6 19.2 9.1 18.7 9.1 18.1C9.1 17.5 8.6 17 8 17C7.4 17 6.9 17.5 6.9 18.1C6.9 18.7 7.4 19.2 8 19.2Z" fill="currentColor" />
      <path d="M17 19.2C17.6 19.2 18.1 18.7 18.1 18.1C18.1 17.5 17.6 17 17 17C16.4 17 15.9 17.5 15.9 18.1C15.9 18.7 16.4 19.2 17 19.2Z" fill="currentColor" />
    </svg>
  );
}

export default function Home({
  onNavigate,
  onOpenDentistPay,
  dentistUnlocked = false,
  isAdmin = false,
  onOpenAdmin,
}) {
  const dentistCard = { width: 440, height: 270 };
  const bloodCard = { width: 440, height: 270 };
  const cardsGapPx = 24;

  const dentistBadgeClass =
    'inline-flex h-10 items-center rounded-full bg-[#FEF3C7] px-4 text-[18px] font-semibold text-[#F97316]';

  const freeBadgeClass =
    'inline-flex h-10 items-center rounded-full bg-[#E0F7FA] px-4 text-[16px] font-medium text-[#18C6C8]';

  const paidButtonClass =
    'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-5 text-[14.5px] font-semibold text-white shadow-sm transition active:scale-[0.98]';

  const freeButtonClass =
    'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#18C6C8] px-6 text-[14.5px] font-semibold text-white shadow-sm transition active:scale-[0.98]';

  return (
    <div className="min-h-screen w-full bg-[#FFFEFA] px-4 py-8">
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="mb-6 w-full">
            {isAdmin ? (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenAdmin?.()}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition active:scale-[0.98]"
                >
                  Админ: промокоды
                </button>
              </div>
            ) : null}
            <div
              className="mb-4 flex items-center justify-center text-white"
              style={{
                backgroundColor: '#18C6C8',
                width: 'auto',
                height: '45px',
                borderRadius: '18px',
                paddingLeft: '16px',
                paddingRight: '16px',
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{
                  color: '#fff',
                  lineHeight: '1.2',
                  fontSize: '20px',
                  fontWeight: '400',
                  textAlign: 'center',
                }}
              >
                Подготовка
              </span>
            </div>

            <h1 className="text-left text-2xl font-bold tracking-tight text-slate-900">
              Выберите направление подготовки
            </h1>

            <p className="mt-3 max-w-xs text-left text-xs leading-5 text-slate-500">
              Каждое направление содержит в себе набор адаптационных материалов: мультфильм, социальная история, игра-тренажер и рекомендации для родителей
            </p>
          </div>

          <div className="flex w-full flex-col items-center" style={{ gap: `${cardsGapPx}px` }}>
            <ScenarioCard
              width={dentistCard.width}
              height={dentistCard.height}
              icon={
                <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-dentist-bg text-primary">
                  <ToothIcon width={34} height={34} />
                </div>
              }
              iconBoxStyle={{ width: '66px', height: '66px' }}
              iconWrapStyle={{ top: '5px', left: '10px' }}
              title="Поход к стоматологу"
              subtitle="Подготовка к визиту стоматолога"
              materialsText="4 материала"
              titleWrapStyle={{ top: '10px', left: '10px' }}
              subtitleWrapStyle={{ top: '13px', left: '10px' }}
              materialsWrapStyle={{ top: '18px', left: '10px' }}
              footerLeft={dentistUnlocked ? <div className={freeBadgeClass}>Доступ открыт</div> : <div className={dentistBadgeClass}>69 ₽</div>}
              footerLeftWrapStyle={{ top: '0px', left: '10px' }}
              footerRightLabel={dentistUnlocked ? 'Начать' : 'Купить'}
              footerRightIcon={dentistUnlocked ? null : <CartIcon className="text-white" />}
              footerRightClassName={dentistUnlocked ? freeButtonClass : paidButtonClass}
              footerRightStyle={{ color: '#fff', borderRadius: '12px', padding: dentistUnlocked ? '0 24px' : '0 20px' }}
              footerRightWrapStyle={{ top: '0px', left: '0px' }}
              onClick={() => dentistUnlocked ? onNavigate('adaptation-dentist') : onOpenDentistPay?.()}
            />

            <ScenarioCard
              width={bloodCard.width}
              height={bloodCard.height}
              icon={
                <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-dentist-bg text-primary">
                  <SyringeIcon width={34} height={34} />
                </div>
              }
              iconBoxStyle={{ width: '66px', height: '66px' }}
              iconWrapStyle={{ top: '5px', left: '10px' }}
              title="Сдача анализа крови"
              subtitle="Подготовка к процедуре забора крови"
              materialsText="3 материала"
              titleWrapStyle={{ top: '10px', left: '10px' }}
              subtitleWrapStyle={{ top: '13px', left: '10px' }}
              materialsWrapStyle={{ top: '18px', left: '10px' }}
              footerLeft={<div className={freeBadgeClass}>Бесплатно</div>}
              footerLeftWrapStyle={{ top: '0px', left: '10px' }}
              footerRightLabel="Начать"
              footerRightClassName={freeButtonClass}
              footerRightStyle={{ color: '#fff', borderRadius: '12px', padding: '0 24px' }}
              footerRightWrapStyle={{ top: '0px', left: '0px' }}
              onClick={() => onNavigate('adaptation')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
