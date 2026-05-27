import { useCallback, useEffect, useState } from 'react'
import './AlphabetQuizModule.css'
import BackButton from './BackButton'
import charactersData from '../data/characters.json'
import audioService from '../services/AudioService'
import {
  QUIZ_LENGTH,
  generateQuizQuestions,
  getQuizPool,
} from '../utils/quiz'

const SCOPE_OPTIONS = [
  { id: 'all', label: 'All letters', description: 'Vowels and consonants' },
  { id: 'vowels', label: 'Vowels only', description: 'स्वर (12 letters)' },
  { id: 'consonants', label: 'Consonants only', description: 'व्यंजन (30 letters)' },
]

function AlphabetQuizModule({ onBack }) {
  const [phase, setPhase] = useState('setup')
  const [scope, setScope] = useState('all')
  const [questions, setQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentQuestion = questions[questionIndex]
  const isAnswered = selected !== null
  const isLastQuestion = questionIndex === questions.length - 1

  useEffect(() => {
    const pool = getQuizPool(charactersData, 'all')
    audioService.preloadAudio(pool.map((char) => char.audioFile))
    return () => audioService.stopAll()
  }, [])

  const playCurrentSound = useCallback(async () => {
    if (!currentQuestion) {
      return
    }
    setIsPlaying(true)
    try {
      await audioService.playAudio(currentQuestion.correct.audioFile)
    } finally {
      setTimeout(() => setIsPlaying(false), 300)
    }
  }, [currentQuestion])

  useEffect(() => {
    if (phase === 'playing' && currentQuestion && selected === null) {
      playCurrentSound()
    }
  }, [phase, questionIndex, currentQuestion, selected, playCurrentSound])

  const startQuiz = () => {
    setQuestions(generateQuizQuestions(charactersData, scope))
    setQuestionIndex(0)
    setScore(0)
    setSelected(null)
    setPhase('playing')
  }

  const handleChoice = (character) => {
    if (isAnswered) {
      return
    }
    setSelected(character)
    if (character.hindi === currentQuestion.correct.hindi) {
      setScore((prev) => prev + 1)
    }
  }

  const goToNext = () => {
    if (isLastQuestion) {
      setPhase('finished')
      return
    }
    setQuestionIndex((prev) => prev + 1)
    setSelected(null)
  }

  const tryAgain = () => {
    setPhase('setup')
    setQuestions([])
    setQuestionIndex(0)
    setScore(0)
    setSelected(null)
  }

  if (phase === 'setup') {
    return (
      <div className="alphabet-quiz-module">
        <div className="alphabet-quiz-header">
          <BackButton onClick={onBack} />
          <h1 className="alphabet-quiz-title">Alphabet Quiz</h1>
        </div>

        <div className="alphabet-quiz-setup">
          <p className="quiz-intro">
            Listen to the sound, then tap the correct Hindi letter.
          </p>

          <fieldset className="quiz-scope-fieldset">
            <legend className="quiz-scope-legend">What do you want to practice?</legend>
            <div className="quiz-scope-options">
              {SCOPE_OPTIONS.map((option) => (
                <label key={option.id} className={`quiz-scope-option ${scope === option.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="quiz-scope"
                    value={option.id}
                    checked={scope === option.id}
                    onChange={() => setScope(option.id)}
                  />
                  <span className="quiz-scope-label">{option.label}</span>
                  <span className="quiz-scope-desc">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="quiz-length-note">{QUIZ_LENGTH} questions per round</p>

          <button type="button" className="quiz-start-button" onClick={startQuiz}>
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'finished') {
    const percent = Math.round((score / questions.length) * 100)
    return (
      <div className="alphabet-quiz-module">
        <div className="alphabet-quiz-header">
          <BackButton onClick={onBack} />
          <h1 className="alphabet-quiz-title">Quiz Complete!</h1>
        </div>

        <div className="quiz-results">
          <div className="quiz-score-circle">
            <span className="quiz-score-value">{score}</span>
            <span className="quiz-score-total">/ {questions.length}</span>
          </div>
          <p className="quiz-score-percent">{percent}% correct</p>
          <p className="quiz-score-message">
            {percent === 100
              ? 'Perfect! You know your letters! 🌟'
              : percent >= 70
                ? 'Great job! Keep practicing! 👏'
                : 'Good try! Listen again and give it another go! 💪'}
          </p>
          <div className="quiz-results-actions">
            <button type="button" className="quiz-start-button" onClick={tryAgain}>
              Try Again
            </button>
            <button type="button" className="quiz-secondary-button" onClick={onBack}>
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="alphabet-quiz-module">
      <div className="alphabet-quiz-header">
        <BackButton onClick={onBack} />
        <h1 className="alphabet-quiz-title">Alphabet Quiz</h1>
      </div>

      <div className="alphabet-quiz-playing">
        <div className="quiz-progress">
          <span>Question {questionIndex + 1} of {questions.length}</span>
          <span className="quiz-live-score">Score: {score}</span>
        </div>

        <div className="quiz-prompt">
          <p className="quiz-prompt-text">Which letter do you hear?</p>
          <button
            type="button"
            className={`quiz-listen-button ${isPlaying ? 'playing' : ''}`}
            onClick={playCurrentSound}
            aria-label="Play sound again"
          >
            🔊 Listen again
          </button>
        </div>

        <div className="quiz-choices" role="group" aria-label="Letter choices">
          {currentQuestion.choices.map((choice) => {
            const isCorrect = choice.hindi === currentQuestion.correct.hindi
            const isSelected = selected?.hindi === choice.hindi
            let choiceClass = 'quiz-choice'
            if (isAnswered) {
              if (isCorrect) {
                choiceClass += ' correct'
              } else if (isSelected) {
                choiceClass += ' incorrect'
              } else {
                choiceClass += ' dimmed'
              }
            }

            return (
              <button
                key={choice.hindi}
                type="button"
                className={choiceClass}
                style={{ backgroundColor: choice.color }}
                onClick={() => handleChoice(choice)}
                disabled={isAnswered}
                aria-label={`Choose letter ${choice.hindi}`}
              >
                <span className="quiz-choice-hindi">{choice.hindi}</span>
                {isAnswered && isSelected && (
                  <span className="quiz-choice-hint">{choice.romanization}</span>
                )}
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <div className="quiz-feedback">
            <p className={selected.hindi === currentQuestion.correct.hindi ? 'feedback-correct' : 'feedback-wrong'}>
              {selected.hindi === currentQuestion.correct.hindi
                ? 'Correct! 🎉'
                : `Not quite — it was ${currentQuestion.correct.hindi} (${currentQuestion.correct.romanization})`}
            </p>
            <button type="button" className="quiz-next-button" onClick={goToNext}>
              {isLastQuestion ? 'See Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AlphabetQuizModule
