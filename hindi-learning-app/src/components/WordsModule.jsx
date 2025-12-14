import { useState, useEffect } from 'react'
import './WordsModule.css'
import WordCard from './WordCard'
import BackButton from './BackButton'
import wordsData from '../data/words.json'
import audioService from '../services/AudioService'

function WordsModule({ onBack }) {
  const [selectedCategory, setSelectedCategory] = useState('animals')

  // Preload audio files when component mounts
  useEffect(() => {
    const audioFiles = wordsData.map(word => word.audioFile)
    audioService.preloadAudio(audioFiles)
  }, [])

  // Get unique categories from the data
  const categories = [...new Set(wordsData.map(word => word.category))]

  // Filter words by selected category
  const filteredWords = wordsData.filter(word => word.category === selectedCategory)

  // Category display names with emojis
  const categoryLabels = {
    animals: '🐾 Animals',
    colors: '🎨 Colors',
    numbers: '🔢 Numbers',
    family: '👨‍👩‍👧‍👦 Family'
  }

  return (
    <div className="words-module">
      <div className="words-header">
        <BackButton onClick={onBack} />
        <h1 className="words-title">Hindi Words</h1>
      </div>

      <div className="words-content">
        <div className="category-selector">
          {categories.map(category => (
            <button
              key={category}
              className={`category-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
              aria-label={`Show ${category} words`}
            >
              {categoryLabels[category] || category}
            </button>
          ))}
        </div>

        <div className="words-grid">
          {filteredWords.map(word => (
            <WordCard
              key={word.id}
              hindiWord={word.hindi}
              englishWord={word.english}
              romanization={word.romanization}
              imageFile={word.imageFile}
              audioFile={word.audioFile}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default WordsModule
