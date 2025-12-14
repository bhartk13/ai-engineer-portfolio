# Assets Documentation

## Overview

This document describes the placeholder audio and image assets included in the Hindi Learning App. These placeholders allow the application to function during development and testing.

## Placeholder Assets

### Audio Files

All audio files are minimal MP3 files (silent audio) located in:
- `/public/audio/vowels/` - 12 vowel pronunciation files
- `/public/audio/consonants/` - 30 consonant pronunciation files  
- `/public/audio/words/` - 34 word pronunciation files
- `/public/audio/phrases/` - 18 phrase pronunciation files

**Total: 94 audio files**

### Image Files

All images are colorful SVG placeholders with text labels located in:
- `/public/images/animals/` - 8 animal images
- `/public/images/colors/` - 8 color images
- `/public/images/numbers/` - 10 number images
- `/public/images/family/` - 8 family member images

**Total: 34 image files**

## Asset Organization

The asset structure matches the data files:
- `src/data/characters.json` → references audio files in `/audio/vowels/` and `/audio/consonants/`
- `src/data/words.json` → references audio in `/audio/words/` and images in `/images/[category]/`
- `src/data/phrases.json` → references audio files in `/audio/phrases/`

## Replacing Placeholders with Real Content

### Audio Files

To replace placeholder audio with real recordings:

1. Record native Hindi speaker pronunciations
2. Export as MP3 format (recommended: 128kbps, mono)
3. Keep file sizes small (<100KB per file recommended)
4. Replace files in the appropriate directory maintaining the same filename
5. Ensure filenames match exactly what's in the JSON data files

**Audio Recording Tips:**
- Use a quiet environment
- Speak clearly at a moderate pace
- Keep recordings short (1-2 seconds for characters, 2-3 seconds for words/phrases)
- Normalize audio levels for consistency

### Image Files

To replace placeholder images with real illustrations:

1. Create or source child-friendly illustrations
2. Export as PNG or SVG format
3. Recommended size: 200x200 pixels minimum
4. Use bright, colorful designs appropriate for children
5. Replace files in the appropriate directory
6. If using PNG instead of SVG, update the file extensions in `src/data/words.json`

**Image Design Tips:**
- Use simple, clear illustrations
- Bright, cheerful colors
- Rounded corners and soft edges
- High contrast for readability
- Culturally appropriate representations

## File Path Verification

All asset paths in the data files use absolute paths starting with `/`:
- Audio: `/audio/[category]/[filename].mp3`
- Images: `/images/[category]/[filename].svg`

These paths are resolved relative to the `public/` directory by Vite during build.

## Generating Placeholders

The `generate_placeholders.py` script was used to create these placeholder files. To regenerate:

```bash
python generate_placeholders.py
```

This script:
- Reads the JSON data files
- Creates minimal MP3 audio files
- Creates colorful SVG placeholder images
- Organizes files in the correct directory structure

## Asset Requirements Summary

| Category | Audio Files | Image Files |
|----------|-------------|-------------|
| Vowels | 12 | 0 |
| Consonants | 30 | 0 |
| Words | 34 | 34 |
| Phrases | 18 | 0 |
| **Total** | **94** | **34** |

## Notes

- All placeholder audio files are silent/minimal MP3s
- All placeholder images are SVG files with text labels
- The app will function with these placeholders but won't provide actual learning content
- Replace placeholders gradually or all at once before production deployment
- Test audio playback and image loading after replacing placeholders
- Ensure all browsers can play the audio format you choose (MP3 is widely supported)
