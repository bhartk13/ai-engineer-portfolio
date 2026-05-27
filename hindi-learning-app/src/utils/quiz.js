/**
 * Quiz helpers for alphabet sound-identification tests.
 */

export const QUIZ_LENGTH = 10
export const CHOICE_COUNT = 4

export function shuffleArray(items) {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export function pickRandomItem(items, excludeHindi = []) {
  const pool = items.filter((item) => !excludeHindi.includes(item.hindi))
  if (pool.length === 0) {
    return null
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Build one multiple-choice question from a character pool.
 */
export function generateQuestion(pool) {
  if (pool.length < CHOICE_COUNT) {
    throw new Error(`Need at least ${CHOICE_COUNT} characters in the pool`)
  }

  const correct = pickRandomItem(pool)
  const wrongChoices = []
  const usedHindi = [correct.hindi]

  while (wrongChoices.length < CHOICE_COUNT - 1) {
    const candidate = pickRandomItem(pool, usedHindi)
    wrongChoices.push(candidate)
    usedHindi.push(candidate.hindi)
  }

  return {
    correct,
    choices: shuffleArray([correct, ...wrongChoices]),
  }
}

/**
 * Filter characters.json entries for quiz pools.
 */
export function getQuizPool(characters, scope) {
  if (scope === 'vowels') {
    return characters.filter((c) => c.type === 'vowel')
  }
  if (scope === 'consonants') {
    return characters.filter((c) => c.type === 'consonant')
  }
  return characters.filter((c) => c.type === 'vowel' || c.type === 'consonant')
}

export function generateQuizQuestions(characters, scope, count = QUIZ_LENGTH) {
  const pool = getQuizPool(characters, scope)
  return Array.from({ length: count }, () => generateQuestion(pool))
}
