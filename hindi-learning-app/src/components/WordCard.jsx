import { useState } from 'react'
import './WordCard.css'
import audioService from '../services/AudioService'

function WordCard({ hindiWord, englishWord, romanization, imageFile, audioFile }) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handleClick = async () => {
    setIsPlaying(true)
    try {
      await audioService.playAudio(audioFile)
    } catch (error) {
      console.error('Error playing audio:', error)
    }
    // Reset playing state after a short delay
    setTimeout(() => setIsPlaying(false), 300)
  }

  return (
    <div 
      className={`word-card ${isPlaying ? 'playing' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Hindi word ${hindiWord}, meaning ${englishWord}, pronounced ${romanization}`}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
    >
      <div className="word-image-container">
        <img 
          src={imageFile} 
          alt={englishWord}
          className="word-image"
          onError={(e) => {
            // Fallback for missing images
            e.target.style.display = 'none'
            e.target.parentElement.classList.add('no-image')
          }}
        />
      </div>
      <div className="word-content">
        <div className="word-hindi">{hindiWord}</div>
        <div className="word-romanization">{romanization}</div>
        <div className="word-english">{englishWord}</div>
      </div>
    </div>
  )
}

export default WordCard
