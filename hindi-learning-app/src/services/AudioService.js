/**
 * AudioService - Manages audio playback for the Hindi learning application
 * Provides audio caching and playback functionality with error handling
 */
class AudioService {
  constructor() {
    // Cache to store preloaded audio elements
    this.audioCache = new Map();
    // Track currently playing audio
    this.currentAudio = null;
  }

  /**
   * Preload audio files into cache
   * @param {string[]} audioFiles - Array of audio file paths to preload
   */
  preloadAudio(audioFiles) {
    audioFiles.forEach(audioFile => {
      if (!this.audioCache.has(audioFile)) {
        try {
          const audio = new Audio(audioFile);
          // Preload the audio
          audio.preload = 'auto';
          
          // Handle loading errors
          audio.addEventListener('error', (e) => {
            console.warn(`Failed to preload audio: ${audioFile}`, e);
          });
          
          this.audioCache.set(audioFile, audio);
        } catch (error) {
          console.error(`Error creating audio element for ${audioFile}:`, error);
        }
      }
    });
  }

  /**
   * Play an audio file
   * @param {string} audioFile - Path to the audio file to play
   * @returns {Promise<void>} Promise that resolves when audio starts playing
   */
  async playAudio(audioFile) {
    try {
      // Stop any currently playing audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }

      // Get audio from cache or create new one
      let audio = this.audioCache.get(audioFile);
      
      if (!audio) {
        audio = new Audio(audioFile);
        audio.preload = 'auto';
        this.audioCache.set(audioFile, audio);
      }

      // Reset audio to beginning
      audio.currentTime = 0;
      
      // Set as current audio
      this.currentAudio = audio;

      // Play the audio
      await audio.play();
      
    } catch (error) {
      console.error(`Error playing audio ${audioFile}:`, error);
      // Don't throw - fail gracefully
      // Visual feedback can be handled by the component
    }
  }

  /**
   * Stop all currently playing audio
   */
  stopAll() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  }

  /**
   * Clear the audio cache
   */
  clearCache() {
    this.audioCache.clear();
    this.currentAudio = null;
  }
}

// Export a singleton instance
const audioService = new AudioService();
export default audioService;
