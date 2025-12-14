import { useEffect } from 'react'
import './AlphabetModule.css'
import CharacterCard from './CharacterCard'
import BackButton from './BackButton'
import charactersData from '../data/characters.json'
import audioService from '../services/AudioService'

function AlphabetModule({ onBack }) {
  // Preload audio files when component mounts
  useEffect(() => {
    const audioFiles = charactersData.map(char => char.audioFile)
    audioService.preloadAudio(audioFiles)
  }, [])

  // Separate vowels and consonants
  const vowels = charactersData.filter(char => char.type === 'vowel')
  const consonants = charactersData.filter(char => char.type === 'consonant')

  return (
    <div className="alphabet-module">
      <div className="alphabet-header">
        <BackButton onClick={onBack} />
        <h1 className="alphabet-title">Hindi Alphabet</h1>
      </div>

      <div className="alphabet-content">
        <section className="alphabet-section">
          <h2 className="section-title">Vowels (स्वर)</h2>
          <div className="characters-grid">
            {vowels.map((char, index) => (
              <CharacterCard
                key={`vowel-${index}`}
                character={char.hindi}
                romanization={char.romanization}
                audioFile={char.audioFile}
                color={char.color}
              />
            ))}
          </div>
        </section>

        <section className="alphabet-section">
          <h2 className="section-title">Consonants (व्यंजन)</h2>
          <div className="characters-grid">
            {consonants.map((char, index) => (
              <CharacterCard
                key={`consonant-${index}`}
                character={char.hindi}
                romanization={char.romanization}
                audioFile={char.audioFile}
                color={char.color}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AlphabetModule
