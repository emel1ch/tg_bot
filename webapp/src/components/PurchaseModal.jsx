function PurchaseModal({ direction, onClose, onPurchase }) {
  const courseItems = {
    dentist: [
      'Социальная история',
      'Онлайн-игра "Иду к стоматологу"',
      'Мультфильм "Иду к стоматологу"',
      'Методические рекомендации для родителей'
    ],
    blood: [
      'Социальная история',
      'Онлайн-игра "Иду сдавать кровь"',
      'Мультфильм "Иду сдавать кровь"'
    ]
  }

  const items = courseItems[direction.id] || []

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal__handle" />

        <div className="modal__title">Покупка доступа</div>
        <div className="modal__subtitle">{direction.title}</div>

        {/* Стоимость */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Стоимость курса</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>
            {direction.price} ₽
          </span>
        </div>

        <p style={{
          fontSize: 13,
          color: 'var(--color-text-muted)',
          marginBottom: 24
        }}>
          Единоразовая оплата. Доступ навсегда.
        </p>

        {/* Что входит в курс */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Что входит в курс:
          </h4>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              fontSize: 14,
              color: 'var(--color-text)'
            }}>
              <span style={{ color: 'var(--color-primary)', fontSize: 18 }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        {/* Кнопка оплаты */}
        <button
          className="btn btn--primary btn--full"
          onClick={() => onPurchase(direction.id)}
        >
          Оплатить {direction.price} ₽
        </button>
      </div>
    </>
  )
}

export default PurchaseModal
