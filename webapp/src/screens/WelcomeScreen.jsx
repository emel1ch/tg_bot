function WelcomeScreen({ onStart }) {
  return (
    <div className="screen welcome relative overflow-hidden">
      {/* Декоративные круги */}
      <div className="welcome__decor welcome__decor--1" />
      <div className="welcome__decor welcome__decor--2" />

      <h1 className="welcome__title">Добро пожаловать!</h1>

      {/* Иллюстрация — заглушка (в продакшене заменить на реальную из Figma) */}
      <div style={{
        width: 260,
        height: 260,
        borderRadius: 24,
        background: 'linear-gradient(135deg, var(--color-primary-light), #e0f2f1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 100,
        marginBottom: 40
      }}>
        👨‍⚕️
      </div>

      <div className="welcome__logo" style={{ marginBottom: 40 }}>
        <span className="welcome__logo-icon">🏃</span>
        <span>ИДУ К<br/>ВРАЧУ</span>
      </div>

      <button
        className="btn btn--primary btn--full"
        onClick={onStart}
        style={{ maxWidth: 300 }}
      >
        Начать
      </button>
    </div>
  )
}

export default WelcomeScreen
