function MaterialsScreen({ direction, onBack, onOpenStory }) {

  const handleMaterialClick = (material) => {
    if (material.type === 'story') {
      onOpenStory()
    } else if (material.type === 'video' && material.link) {
      window.open(material.link, '_blank')
    } else if (material.type === 'game' && material.link) {
      window.open(material.link, '_blank')
    } else if (material.type === 'recommendations') {
      // TODO: экран рекомендаций
      alert('Рекомендации для родителей — будет реализовано')
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <button className="header__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="header__pill">{direction.title}</div>
      </div>

      <h2 className="menu__title">Материалы для адаптации</h2>
      <div style={{ height: 16 }} />

      {direction.materials.map(material => (
        <div className="card" key={material.id}>
          <div className="card__subtitle">{material.title}</div>
          <div className="card__title" style={{ fontSize: 15 }}>{material.subtitle}</div>
          <div className="card__description">{material.description}</div>

          <div className="card__footer">
            {material.duration && (
              <span className="card__meta" style={{ margin: 0 }}>
                🕐 {material.duration}
              </span>
            )}
            <button
              className="btn btn--primary btn--sm"
              onClick={() => handleMaterialClick(material)}
            >
              ▶ Начать
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MaterialsScreen
