/**
 * Barahkhadi (बारहखड़ी) — the 12 vowel forms for each Hindi consonant.
 * e.g. क, का, कि, की, कु, कू, के, कै, को, कौ, कं, कः → ka, kaa, ki, kee, ku, ...
 */

export const BARAHKHADI_VOWELS = [
  { key: 'a', matra: '', vowelLabel: 'अ', romanSuffix: 'a' },
  { key: 'aa', matra: '\u093E', vowelLabel: 'आ', romanSuffix: 'aa' },
  { key: 'i', matra: '\u093F', vowelLabel: 'इ', romanSuffix: 'i' },
  { key: 'ee', matra: '\u0940', vowelLabel: 'ई', romanSuffix: 'ee' },
  { key: 'u', matra: '\u0941', vowelLabel: 'उ', romanSuffix: 'u' },
  { key: 'oo', matra: '\u0942', vowelLabel: 'ऊ', romanSuffix: 'oo' },
  { key: 'e', matra: '\u0947', vowelLabel: 'ए', romanSuffix: 'e' },
  { key: 'ai', matra: '\u0948', vowelLabel: 'ऐ', romanSuffix: 'ai' },
  { key: 'o', matra: '\u094B', vowelLabel: 'ओ', romanSuffix: 'o' },
  { key: 'au', matra: '\u094C', vowelLabel: 'औ', romanSuffix: 'au' },
  { key: 'am', matra: '\u0902', vowelLabel: 'अं', romanSuffix: 'am' },
  { key: 'ah', matra: '\u0903', vowelLabel: 'अः', romanSuffix: 'ah' },
]

/**
 * Strip the inherent 'a' from consonant romanization to get the consonant stem.
 * e.g. "ka" -> "k", "kha" -> "kh", "chha" -> "chh"
 */
export function getConsonantStem(romanization) {
  if (romanization.endsWith('a')) {
    return romanization.slice(0, -1)
  }
  return romanization
}

/**
 * Build Hindi grapheme for consonant + vowel matra.
 */
export function buildBarahkhadiHindi(consonantHindi, vowelKey) {
  const vowel = BARAHKHADI_VOWELS.find((v) => v.key === vowelKey)
  if (!vowel) {
    return consonantHindi
  }
  if (vowel.key === 'a') {
    return consonantHindi
  }
  const baseCodePoint = consonantHindi.codePointAt(0)
  return String.fromCodePoint(baseCodePoint) + vowel.matra
}

/**
 * Build romanization for a barahkhadi form.
 */
export function buildBarahkhadiRomanization(consonantRomanization, vowelKey) {
  const stem = getConsonantStem(consonantRomanization)
  const vowel = BARAHKHADI_VOWELS.find((v) => v.key === vowelKey)
  if (!vowel) {
    return consonantRomanization
  }
  if (vowel.key === 'a') {
    return consonantRomanization
  }
  return stem + vowel.romanSuffix
}

/**
 * Unique key per consonant (from audio filename, e.g. ta vs ta2 for ट vs त).
 */
export function getConsonantKey(consonant) {
  const match = consonant.audioFile?.match(/\/([^/]+)\.mp3$/)
  return match ? match[1] : consonant.romanization
}

/**
 * Audio path for a barahkhadi syllable.
 */
export function getBarahkhadiAudioPath(consonant, vowelKey) {
  const consonantKey = typeof consonant === 'string' ? consonant : getConsonantKey(consonant)
  return `/audio/barahkhadi/${consonantKey}/${vowelKey}.mp3`
}

/**
 * Generate all 12 barahkhadi forms for a consonant.
 */
export function generateBarahkhadiForConsonant(consonant) {
  return BARAHKHADI_VOWELS.map((vowel) => ({
    hindi: buildBarahkhadiHindi(consonant.hindi, vowel.key),
    romanization: buildBarahkhadiRomanization(consonant.romanization, vowel.key),
    vowelKey: vowel.key,
    vowelLabel: vowel.vowelLabel,
    audioFile: getBarahkhadiAudioPath(consonant, vowel.key),
    color: consonant.color,
  }))
}

/**
 * Collect all barahkhadi audio paths for preloading.
 */
export function getAllBarahkhadiAudioPaths(consonants) {
  return consonants.flatMap((consonant) =>
    BARAHKHADI_VOWELS.map((vowel) => getBarahkhadiAudioPath(consonant, vowel.key))
  )
}
