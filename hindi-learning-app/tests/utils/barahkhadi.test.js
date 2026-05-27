import { describe, it, expect } from 'vitest'
import charactersData from '../../src/data/characters.json'
import {
  BARAHKHADI_VOWELS,
  buildBarahkhadiHindi,
  buildBarahkhadiRomanization,
  generateBarahkhadiForConsonant,
  getAllBarahkhadiAudioPaths,
  getBarahkhadiAudioPath,
} from '../../src/utils/barahkhadi'

describe('barahkhadi utility', () => {
  const ka = charactersData.find((c) => c.romanization === 'ka')

  it('should define 12 vowel forms', () => {
    expect(BARAHKHADI_VOWELS).toHaveLength(12)
  })

  it('should generate correct Hindi forms for ka', () => {
    expect(buildBarahkhadiHindi(ka.hindi, 'a')).toBe('क')
    expect(buildBarahkhadiHindi(ka.hindi, 'aa')).toBe('का')
    expect(buildBarahkhadiHindi(ka.hindi, 'i')).toBe('कि')
    expect(buildBarahkhadiHindi(ka.hindi, 'ee')).toBe('की')
    expect(buildBarahkhadiHindi(ka.hindi, 'u')).toBe('कु')
    expect(buildBarahkhadiHindi(ka.hindi, 'oo')).toBe('कू')
    expect(buildBarahkhadiHindi(ka.hindi, 'e')).toBe('के')
    expect(buildBarahkhadiHindi(ka.hindi, 'ai')).toBe('कै')
    expect(buildBarahkhadiHindi(ka.hindi, 'o')).toBe('को')
    expect(buildBarahkhadiHindi(ka.hindi, 'au')).toBe('कौ')
    expect(buildBarahkhadiHindi(ka.hindi, 'am')).toBe('कं')
    expect(buildBarahkhadiHindi(ka.hindi, 'ah')).toBe('कः')
  })

  it('should generate correct romanization for ka', () => {
    expect(buildBarahkhadiRomanization('ka', 'a')).toBe('ka')
    expect(buildBarahkhadiRomanization('ka', 'aa')).toBe('kaa')
    expect(buildBarahkhadiRomanization('ka', 'i')).toBe('ki')
    expect(buildBarahkhadiRomanization('ka', 'ee')).toBe('kee')
    expect(buildBarahkhadiRomanization('ka', 'u')).toBe('ku')
    expect(buildBarahkhadiRomanization('ka', 'oo')).toBe('koo')
    expect(buildBarahkhadiRomanization('ka', 'e')).toBe('ke')
    expect(buildBarahkhadiRomanization('ka', 'ai')).toBe('kai')
    expect(buildBarahkhadiRomanization('ka', 'o')).toBe('ko')
    expect(buildBarahkhadiRomanization('ka', 'au')).toBe('kau')
    expect(buildBarahkhadiRomanization('ka', 'am')).toBe('kam')
    expect(buildBarahkhadiRomanization('ka', 'ah')).toBe('kah')
  })

  it('should generate 12 forms per consonant', () => {
    const forms = generateBarahkhadiForConsonant(ka)
    expect(forms).toHaveLength(12)
    expect(forms[0].romanization).toBe('ka')
    expect(forms[3].romanization).toBe('kee')
    expect(forms[4].romanization).toBe('ku')
  })

  it('should use relative audio paths', () => {
    expect(getBarahkhadiAudioPath(ka, 'i')).toBe('/audio/barahkhadi/ka/i.mp3')
    expect(getBarahkhadiAudioPath(ka, 'i')).not.toMatch(/^http/)
  })

  it('should generate audio paths for all consonants', () => {
    const consonants = charactersData.filter((c) => c.type === 'consonant')
    const paths = getAllBarahkhadiAudioPaths(consonants)
    expect(paths).toHaveLength(consonants.length * 12)
    paths.forEach((path) => {
      expect(path).toMatch(/^\/audio\/barahkhadi\//)
    })
  })
})
