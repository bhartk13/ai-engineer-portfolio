import { useEffect } from 'react'
import './AlphabetModule.css'
import CharacterCard from './CharacterCard'
import ConsonantBarahkhadiGroup from './ConsonantBarahkhadiGroup'
import BackButton from './BackButton'
import charactersData from '../data/characters.json'
import audioService from '../services/AudioService'
import { getAllBarahkhadiAudioPaths } from '../utils/barahkhadi'

function AlphabetModule({ onBack }) {
  const vowels = charactersData.filter((char) => char.type === 'vowel')
  const consonants = charactersData.filter((char) => char.type === 'consonant')

  useEffect(() => {
    const allConsonants = charactersData.filter((char) => char.type === 'consonant')
    const characterAudio = charactersData.map((char) => char.audioFile)
    const barahkhadiAudio = getAllBarahkhadiAudioPaths(allConsonants)
    audioService.preloadAudio([...characterAudio, ...barahkhadiAudio])
  }, [])

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

        <section className="alphabet-section">
          <h2 className="section-title">Barahkhadi (बारहखड़ी)</h2>
          <p className="section-description">
            Each consonant with all 12 vowels — ka, kaa, ki, kee, ku, koo, ke, kai, ko, kau, kam, kah
          </p>
          <div className="barahkhadi-section">
            {consonants.map((consonant, index) => (
              <ConsonantBarahkhadiGroup
                key={`barahkhadi-${consonant.hindi}-${index}`}
                consonant={consonant}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AlphabetModule
