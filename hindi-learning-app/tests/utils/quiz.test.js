import { describe, it, expect } from 'vitest'
import charactersData from '../../src/data/characters.json'
import {
  CHOICE_COUNT,
  QUIZ_LENGTH,
  generateQuestion,
  generateQuizQuestions,
  getQuizPool,
  shuffleArray,
} from '../../src/utils/quiz'

describe('quiz utility', () => {
  it('should shuffle without losing items', () => {
    const input = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(input)
    expect(shuffled).toHaveLength(5)
    expect(shuffled.sort()).toEqual(input.sort())
  })

  it('should return vowels only for vowels scope', () => {
    const pool = getQuizPool(charactersData, 'vowels')
    expect(pool.every((c) => c.type === 'vowel')).toBe(true)
    expect(pool.length).toBe(12)
  })

  it('should return consonants only for consonants scope', () => {
    const pool = getQuizPool(charactersData, 'consonants')
    expect(pool.every((c) => c.type === 'consonant')).toBe(true)
    expect(pool.length).toBe(30)
  })

  it('should generate a question with 4 unique choices', () => {
    const pool = getQuizPool(charactersData, 'all')
    const question = generateQuestion(pool)

    expect(question.choices).toHaveLength(CHOICE_COUNT)
    expect(question.correct).toBeDefined()

    const hindiLetters = question.choices.map((c) => c.hindi)
    expect(new Set(hindiLetters).size).toBe(CHOICE_COUNT)
    expect(hindiLetters).toContain(question.correct.hindi)
  })

  it('should generate a full quiz round', () => {
    const questions = generateQuizQuestions(charactersData, 'all', 10)
    expect(questions).toHaveLength(QUIZ_LENGTH)
    questions.forEach((q) => {
      expect(q.choices).toHaveLength(CHOICE_COUNT)
    })
  })
})
