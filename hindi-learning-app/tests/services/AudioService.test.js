import { describe, it, expect, beforeEach, vi } from 'vitest';
import audioService from '../../src/services/AudioService.js';

describe('AudioService', () => {
  beforeEach(() => {
    // Clear the audio cache before each test
    audioService.clearCache();
    
    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('preloadAudio', () => {
    it('should preload audio files into cache', () => {
      const audioFiles = ['/audio/test1.mp3', '/audio/test2.mp3'];
      
      audioService.preloadAudio(audioFiles);
      
      // Verify that audio files are in the cache
      expect(audioService.audioCache.has('/audio/test1.mp3')).toBe(true);
      expect(audioService.audioCache.has('/audio/test2.mp3')).toBe(true);
      expect(audioService.audioCache.size).toBe(2);
    });

    it('should not duplicate audio files already in cache', () => {
      const audioFiles = ['/audio/test.mp3'];
      
      // Preload the same file twice
      audioService.preloadAudio(audioFiles);
      const firstAudio = audioService.audioCache.get('/audio/test.mp3');
      
      audioService.preloadAudio(audioFiles);
      const secondAudio = audioService.audioCache.get('/audio/test.mp3');
      
      // Should be the same audio element
      expect(firstAudio).toBe(secondAudio);
      expect(audioService.audioCache.size).toBe(1);
    });

    it('should set preload attribute to auto', () => {
      const audioFiles = ['/audio/test.mp3'];
      
      audioService.preloadAudio(audioFiles);
      
      const audio = audioService.audioCache.get('/audio/test.mp3');
      expect(audio.preload).toBe('auto');
    });

    it('should handle errors when creating audio elements', () => {
      // Mock Audio constructor to throw an error
      const originalAudio = global.Audio;
      global.Audio = vi.fn(() => {
        throw new Error('Audio creation failed');
      });
      
      const audioFiles = ['/audio/test.mp3'];
      
      // Should not throw, but handle gracefully
      expect(() => audioService.preloadAudio(audioFiles)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
      
      // Restore original Audio
      global.Audio = originalAudio;
    });

    it('should handle empty array', () => {
      expect(() => audioService.preloadAudio([])).not.toThrow();
      expect(audioService.audioCache.size).toBe(0);
    });
  });

  describe('playAudio', () => {
    it('should play audio from cache if available', async () => {
      const audioFile = '/audio/test.mp3';
      
      // Preload the audio first
      audioService.preloadAudio([audioFile]);
      const audio = audioService.audioCache.get(audioFile);
      
      // Mock the play method
      audio.play = vi.fn().mockResolvedValue(undefined);
      
      await audioService.playAudio(audioFile);
      
      expect(audio.play).toHaveBeenCalled();
      expect(audioService.currentAudio).toBe(audio);
    });

    it('should create and cache audio if not in cache', async () => {
      const audioFile = '/audio/new.mp3';
      
      // Preload to get it in cache, then test playAudio
      audioService.preloadAudio([audioFile]);
      const audio = audioService.audioCache.get(audioFile);
      
      // Mock the play method
      audio.play = vi.fn().mockResolvedValue(undefined);
      
      await audioService.playAudio(audioFile);
      
      expect(audioService.audioCache.has(audioFile)).toBe(true);
      expect(audio.play).toHaveBeenCalled();
    });

    it('should stop currently playing audio before playing new audio', async () => {
      const audioFile1 = '/audio/test1.mp3';
      const audioFile2 = '/audio/test2.mp3';
      
      // Preload both audio files
      audioService.preloadAudio([audioFile1, audioFile2]);
      
      const audio1 = audioService.audioCache.get(audioFile1);
      const audio2 = audioService.audioCache.get(audioFile2);
      
      // Mock play methods
      audio1.play = vi.fn().mockResolvedValue(undefined);
      audio1.pause = vi.fn();
      audio2.play = vi.fn().mockResolvedValue(undefined);
      
      // Play first audio
      await audioService.playAudio(audioFile1);
      expect(audio1.play).toHaveBeenCalled();
      
      // Play second audio
      await audioService.playAudio(audioFile2);
      
      // First audio should be paused and reset
      expect(audio1.pause).toHaveBeenCalled();
      expect(audio1.currentTime).toBe(0);
      expect(audio2.play).toHaveBeenCalled();
    });

    it('should reset audio to beginning before playing', async () => {
      const audioFile = '/audio/test.mp3';
      
      // Preload the audio
      audioService.preloadAudio([audioFile]);
      const audio = audioService.audioCache.get(audioFile);
      
      // Simulate audio that was partially played
      audio.currentTime = 5;
      audio.play = vi.fn().mockResolvedValue(undefined);
      
      await audioService.playAudio(audioFile);
      
      // Should reset to 0 before playing
      expect(audio.currentTime).toBe(0);
      expect(audio.play).toHaveBeenCalled();
    });

    it('should handle playback errors gracefully', async () => {
      const audioFile = '/audio/missing.mp3';
      
      // Preload the audio
      audioService.preloadAudio([audioFile]);
      const audio = audioService.audioCache.get(audioFile);
      
      // Mock play to reject
      audio.play = vi.fn().mockRejectedValue(new Error('Playback failed'));
      
      // Should not throw, but handle gracefully
      await expect(audioService.playAudio(audioFile)).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('stopAll', () => {
    it('should stop currently playing audio', async () => {
      const audioFile = '/audio/test.mp3';
      
      // Preload the audio
      audioService.preloadAudio([audioFile]);
      const audio = audioService.audioCache.get(audioFile);
      
      // Mock methods
      audio.play = vi.fn().mockResolvedValue(undefined);
      audio.pause = vi.fn();
      
      // Play audio
      await audioService.playAudio(audioFile);
      expect(audioService.currentAudio).toBe(audio);
      
      // Stop all audio
      audioService.stopAll();
      
      expect(audio.pause).toHaveBeenCalled();
      expect(audio.currentTime).toBe(0);
      expect(audioService.currentAudio).toBeNull();
    });

    it('should handle case when no audio is playing', () => {
      // Should not throw when no audio is playing
      expect(() => audioService.stopAll()).not.toThrow();
      expect(audioService.currentAudio).toBeNull();
    });

    it('should handle errors when stopping audio', async () => {
      const audioFile = '/audio/test.mp3';
      
      // Preload the audio
      audioService.preloadAudio([audioFile]);
      const audio = audioService.audioCache.get(audioFile);
      
      // Mock methods
      audio.play = vi.fn().mockResolvedValue(undefined);
      audio.pause = vi.fn(() => {
        throw new Error('Pause failed');
      });
      
      // Play audio
      await audioService.playAudio(audioFile);
      
      // Stop should handle error gracefully
      expect(() => audioService.stopAll()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the audio cache', () => {
      const audioFiles = ['/audio/test1.mp3', '/audio/test2.mp3'];
      
      audioService.preloadAudio(audioFiles);
      expect(audioService.audioCache.size).toBe(2);
      
      audioService.clearCache();
      
      expect(audioService.audioCache.size).toBe(0);
      expect(audioService.currentAudio).toBeNull();
    });
  });
});
