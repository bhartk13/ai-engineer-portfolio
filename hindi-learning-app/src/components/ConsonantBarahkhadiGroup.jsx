import CharacterCard from './CharacterCard'
import { generateBarahkhadiForConsonant } from '../utils/barahkhadi'
import './ConsonantBarahkhadiGroup.css'

function ConsonantBarahkhadiGroup({ consonant }) {
  const barahkhadi = generateBarahkhadiForConsonant(consonant)

  return (
    <article className="consonant-barahkhadi-group" aria-label={`Barahkhadi for ${consonant.romanization}`}>
      <div className="consonant-barahkhadi-header">
        <span className="consonant-barahkhadi-letter">{consonant.hindi}</span>
        <span className="consonant-barahkhadi-name">{consonant.romanization}</span>
      </div>
      <div className="barahkhadi-grid">
        {barahkhadi.map((form) => (
          <CharacterCard
            key={`${consonant.romanization}-${form.vowelKey}`}
            character={form.hindi}
            romanization={form.romanization}
            audioFile={form.audioFile}
            color={form.color}
            compact
            vowelLabel={form.vowelLabel}
          />
        ))}
      </div>
    </article>
  )
}

export default ConsonantBarahkhadiGroup
