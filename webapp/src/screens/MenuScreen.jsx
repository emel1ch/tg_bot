import { useState } from 'react'
import PurchaseModal from '../components/PurchaseModal'

function MenuScreen({ directions, onSelectDirection, onPurchase, onBack }) {
  const [purchaseModal, setPurchaseModal] = useState(null)

  const handleAction = (direction) => {
    if (direction.price && !direction.purchased) {
      setPurchaseModal(direction)
    } else {
      onSelectDirection(direction.id)
    }
  }

  const handlePurchaseConfirm = (directionId) => {
    onPurchase(directionId)
    setPurchaseModal(null)
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="header__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="header__pill">Подготовка</div>
      </div>

      <div className="menu">
        <h2 className="menu__title">Выберите направление подготовки</h2>
        <p className="menu__description">
          Каждое направление содержит в себе набор адаптационных материалов: мультфильм,
          социальная история, игра-тренажер и рекомендации для родителей
        </p>

        {directions.map(direction => (
          <div className="card" key={direction.id}>
            <div className="card__icon">{direction.icon}</div>
            <div className="card__title">{direction.title}</div>
            <div className="card__description">{direction.description}</div>
            <div className="card__meta">{direction.materialsCount} материала</div>

            <div className="card__footer">
              {direction.price && !direction.purchased ? (
                <>
                  <span className="card__price">{direction.price} ₽</span>
                  <button
                    className="btn btn--accent btn--sm"
                    onClick={() => handleAction(direction)}
                  >
                    🛒 Купить
                  </button>
                </>
              ) : (
                <>
                  {direction.price === null && (
                    <span className="card__price card__price--free">Бесплатно</span>
                  )}
                  {direction.purchased && direction.price && (
                    <span style={{ fontSize: 13, color: 'var(--color-success)' }}>✓ Куплено</span>
                  )}
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => handleAction(direction)}
                  >
                    ▶ Начать
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {purchaseModal && (
        <PurchaseModal
          direction={purchaseModal}
          onClose={() => setPurchaseModal(null)}
          onPurchase={handlePurchaseConfirm}
        />
      )}
    </div>
  )
}

export default MenuScreen
