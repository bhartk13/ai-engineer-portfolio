import './MainMenu.css'

function MainMenu({ onNavigate }) {
  return (
    <div className="main-menu">
      <h1 className="app-title">Learn Hindi! 🎨</h1>
      <p className="app-subtitle">Choose a learning module</p>
      
      <div className="menu-buttons">
        <button 
          className="menu-button alphabet-button"
          onClick={() => onNavigate('alphabet')}
          aria-label="Learn the Hindi Alphabet"
        >
          <span className="button-icon">🔤</span>
          <span className="button-text">Alphabet</span>
          <span className="button-description">Learn Hindi letters</span>
        </button>

        <button
          className="menu-button quiz-button"
          onClick={() => onNavigate('quiz')}
          aria-label="Test your Hindi alphabet knowledge"
        >
          <span className="button-icon">🎯</span>
          <span className="button-text">Alphabet Quiz</span>
          <span className="button-description">Identify letters from sound</span>
        </button>
        
        <button 
          className="menu-button words-button"
          onClick={() => onNavigate('words')}
          aria-label="Learn Hindi Words"
        >
          <span className="button-icon">📚</span>
          <span className="button-text">Words</span>
          <span className="button-description">Learn common words</span>
        </button>
        
        <button 
          className="menu-button phrases-button"
          onClick={() => onNavigate('phrases')}
          aria-label="Learn Hindi Phrases"
        >
          <span className="button-icon">💬</span>
          <span className="button-text">Phrases</span>
          <span className="button-description">Learn useful phrases</span>
        </button>
      </div>
    </div>
  )
}

export default MainMenu
