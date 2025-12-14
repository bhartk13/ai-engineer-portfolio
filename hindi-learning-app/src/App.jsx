import { useState } from 'react'
import './App.css'
import MainMenu from './components/MainMenu'
import AlphabetModule from './components/AlphabetModule'
import WordsModule from './components/WordsModule'
import BackButton from './components/BackButton'

function App() {
  const [currentView, setCurrentView] = useState('menu')

  const navigateTo = (view) => {
    setCurrentView(view)
  }

  const navigateToMenu = () => {
    setCurrentView('menu')
  }

  return (
    <div className="app">
      {currentView === 'menu' && (
        <div className="view-container">
          <MainMenu onNavigate={navigateTo} />
        </div>
      )}
      
      {currentView === 'alphabet' && (
        <div className="view-container">
          <AlphabetModule onBack={navigateToMenu} />
        </div>
      )}
      
      {currentView === 'words' && (
        <div className="view-container">
          <WordsModule onBack={navigateToMenu} />
        </div>
      )}
      
      {currentView === 'phrases' && (
        <div className="view-container">
          <div className="module-view">
            <div className="module-header">
              <BackButton onClick={navigateToMenu} />
              <h2>Phrases Module</h2>
            </div>
            <p>Coming soon...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
