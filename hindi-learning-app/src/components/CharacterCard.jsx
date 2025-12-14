import { useState } from 'react'
import './CharacterCard.css'
import audioService from '../services/AudioService'

function CharacterCard({ character, romanization, audioFile, color }) {
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
      className={`character-card ${isPlaying ? 'playing' : ''}`}
      onClick={handleClick}
      style={{ backgroundColor: color }}
      role="button"
      tabIndex={0}
      aria-label={`Hindi character ${character}, pronounced ${romanization}`}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
    >
      <div className="character-hindi">{character}</div>
      <div className="character-romanization">{romanization}</div>
    </div>
  )
}

export default CharacterCard
