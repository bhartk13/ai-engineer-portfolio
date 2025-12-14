/**
 * Integration test for offline functionality and asset loading
 * Validates Requirements: 5.2, 8.2, 8.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import charactersData from '../../src/data/characters.json';
import wordsData from '../../src/data/words.json';
import phrasesData from '../../src/data/phrases.json';

describe('Offline Functionality and Asset Loading', () => {
  describe('Application Flow', () => {
    it('should render main menu on initial load', () => {
      render(<App />);
      
      // Main menu should be visible
      expect(screen.getByText(/Learn Hindi!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Learn the Hindi Alphabet/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Learn Hindi Words/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Learn Hindi Phrases/i })).toBeInTheDocument();
    });

    it('should navigate to alphabet module', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const alphabetButton = screen.getByText(/Alphabet/i);
      await user.click(alphabetButton);
      
      // Should show alphabet module
      expect(screen.getByText(/Vowels/i)).toBeInTheDocument();
    });

    it('should navigate to words module', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const wordsButton = screen.getByRole('button', { name: /Learn Hindi Words/i });
      await user.click(wordsButton);
      
      // Should show words module with categories
      expect(screen.getByText(/Animals/i)).toBeInTheDocument();
    });

    it('should navigate back to main menu from modules', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Navigate to alphabet
      const alphabetButton = screen.getByRole('button', { name: /Learn the Hindi Alphabet/i });
      await user.click(alphabetButton);
      
      // Click back button
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      // Should be back at main menu
      expect(screen.getByText(/Learn Hindi!/i)).toBeInTheDocument();
    });
  });

  describe('Data Integrity', () => {
    it('should have valid characters data', () => {
      expect(charactersData).toBeDefined();
      expect(Array.isArray(charactersData)).toBe(true);
      expect(charactersData.length).toBeGreaterThan(0);
      
      // Check first character has required fields
      const firstChar = charactersData[0];
      expect(firstChar).toHaveProperty('hindi');
      expect(firstChar).toHaveProperty('romanization');
      expect(firstChar).toHaveProperty('audioFile');
      expect(firstChar).toHaveProperty('type');
      expect(firstChar).toHaveProperty('color');
    });

    it('should have valid words data', () => {
      expect(wordsData).toBeDefined();
      expect(Array.isArray(wordsData)).toBe(true);
      expect(wordsData.length).toBeGreaterThan(0);
      
      // Check first word has required fields
      const firstWord = wordsData[0];
      expect(firstWord).toHaveProperty('hindi');
      expect(firstWord).toHaveProperty('english');
      expect(firstWord).toHaveProperty('romanization');
      expect(firstWord).toHaveProperty('category');
      expect(firstWord).toHaveProperty('imageFile');
      expect(firstWord).toHaveProperty('audioFile');
    });

    it('should have valid phrases data', () => {
      expect(phrasesData).toBeDefined();
      expect(Array.isArray(phrasesData)).toBe(true);
      expect(phrasesData.length).toBeGreaterThan(0);
      
      // Check first phrase has required fields
      const firstPhrase = phrasesData[0];
      expect(firstPhrase).toHaveProperty('hindi');
      expect(firstPhrase).toHaveProperty('english');
      expect(firstPhrase).toHaveProperty('romanization');
      expect(firstPhrase).toHaveProperty('audioFile');
    });
  });

  describe('Asset Path Validation (Requirement 8.4)', () => {
    it('should use relative paths for character audio files', () => {
      charactersData.forEach(char => {
        // Paths should start with / (relative to public folder in Vite)
        expect(char.audioFile).toMatch(/^\/audio\//);
        expect(char.audioFile).not.toMatch(/^http/);
        expect(char.audioFile).not.toMatch(/^https/);
      });
    });

    it('should use relative paths for word audio and image files', () => {
      wordsData.forEach(word => {
        // Audio paths should be relative
        expect(word.audioFile).toMatch(/^\/audio\//);
        expect(word.audioFile).not.toMatch(/^http/);
        
        // Image paths should be relative
        expect(word.imageFile).toMatch(/^\/images\//);
        expect(word.imageFile).not.toMatch(/^http/);
      });
    });

    it('should use relative paths for phrase audio files', () => {
      phrasesData.forEach(phrase => {
        expect(phrase.audioFile).toMatch(/^\/audio\//);
        expect(phrase.audioFile).not.toMatch(/^http/);
        expect(phrase.audioFile).not.toMatch(/^https/);
      });
    });
  });

  describe('Content Completeness', () => {
    it('should have both vowels and consonants', () => {
      const vowels = charactersData.filter(c => c.type === 'vowel');
      const consonants = charactersData.filter(c => c.type === 'consonant');
      
      expect(vowels.length).toBeGreaterThan(0);
      expect(consonants.length).toBeGreaterThan(0);
    });

    it('should have words in all required categories', () => {
      const categories = ['animals', 'colors', 'numbers', 'family'];
      
      categories.forEach(category => {
        const wordsInCategory = wordsData.filter(w => w.category === category);
        expect(wordsInCategory.length).toBeGreaterThan(0);
      });
    });

    it('should have at least 40 characters total', () => {
      // Hindi has 12 vowels and 33 consonants
      expect(charactersData.length).toBeGreaterThanOrEqual(40);
    });

    it('should have at least 30 words total', () => {
      expect(wordsData.length).toBeGreaterThanOrEqual(30);
    });

    it('should have at least 15 phrases total', () => {
      expect(phrasesData.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('No Network Requests (Requirement 5.2)', () => {
    it('should not make external network requests', () => {
      // All data is imported directly from JSON files
      // Audio and images are loaded from local public folder
      // This test verifies that data is available without network
      
      expect(charactersData).toBeDefined();
      expect(wordsData).toBeDefined();
      expect(phrasesData).toBeDefined();
      
      // Verify no external URLs in data
      const allAudioFiles = [
        ...charactersData.map(c => c.audioFile),
        ...wordsData.map(w => w.audioFile),
        ...phrasesData.map(p => p.audioFile)
      ];
      
      allAudioFiles.forEach(audioFile => {
        expect(audioFile).not.toMatch(/^http/);
        expect(audioFile).not.toMatch(/^https/);
        expect(audioFile).not.toMatch(/^\/\//);
      });
    });
  });
});
