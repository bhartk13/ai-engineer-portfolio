# Hindi Learning App 🎨📚

A colorful, interactive Hindi-learning application designed for children that runs locally on Windows using a web browser. Built with React and Vite, this app provides an engaging environment for kids to learn Hindi letters, words, and basic phrases through visual and interactive elements.

## Features

- **Alphabet Module**: Learn Hindi vowels, consonants, and barahkhadi (बारहखड़ी — ka, kaa, ki, kee, ku, etc. for each consonant) with audio pronunciations
- **Alphabet Quiz**: Beginner sound-identification test — hear a letter and pick the correct Hindi character (vowels, consonants, or both)
- **Words Module**: Explore common Hindi words organized by categories (animals, colors, numbers, family)
- **Phrases Module**: Practice simple Hindi phrases with English translations
- **Audio Playback**: Click any character, word, or phrase to hear its pronunciation
- **Offline Support**: Works completely offline - no internet connection required
- **Child-Friendly Design**: Bright colors, large fonts, and smooth animations
- **Local Deployment**: Runs directly from your file system without a web server

## Project Setup

This project is built with React and Vite, configured for local file system usage without requiring a web server.

### Dependencies Installed

- **React 19.2.0** - UI framework
- **Vite 7.2.4** - Build tool and dev server
- **Vitest 4.0.15** - Testing framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom DOM matchers
- **fast-check** - Property-based testing library

### Project Structure

```
hindi-learning-app/
├── public/                      # Static assets
│   ├── audio/                   # Audio files for pronunciations
│   │   ├── vowels/              # Hindi vowel sounds (a.mp3, aa.mp3, etc.)
│   │   ├── consonants/          # Hindi consonant sounds (ka.mp3, kha.mp3, etc.)
│   │   ├── words/               # Word pronunciations (dog.mp3, cat.mp3, etc.)
│   │   └── phrases/             # Phrase pronunciations (namaste.mp3, etc.)
│   └── images/                  # Visual assets
│       ├── animals/             # Animal illustrations (dog.svg, cat.svg, etc.)
│       ├── colors/              # Color swatches (red.svg, blue.svg, etc.)
│       ├── numbers/             # Number illustrations (one.svg, two.svg, etc.)
│       └── family/              # Family member illustrations
├── src/
│   ├── components/              # React components
│   │   ├── App.jsx              # Root component with view management
│   │   ├── MainMenu.jsx         # Landing page with navigation
│   │   ├── AlphabetModule.jsx   # Hindi alphabet learning module
│   │   ├── CharacterCard.jsx    # Individual character display
│   │   ├── WordsModule.jsx      # Words learning module
│   │   ├── WordCard.jsx         # Individual word card
│   │   ├── PhrasesModule.jsx    # Phrases learning module (to be implemented)
│   │   ├── PhraseCard.jsx       # Individual phrase card (to be implemented)
│   │   └── BackButton.jsx       # Navigation back button
│   ├── services/
│   │   └── AudioService.js      # Audio playback management
│   ├── data/                    # Content data files
│   │   ├── characters.json      # Hindi characters with romanization
│   │   ├── words.json           # Hindi words with translations
│   │   └── phrases.json         # Hindi phrases with translations
│   ├── styles/                  # Component-specific CSS
│   ├── utils/                   # Utility functions
│   ├── test/
│   │   └── setup.js             # Test configuration
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Global styles
├── tests/                       # Test files
│   ├── components/              # Component tests
│   ├── services/                # Service tests
│   │   └── AudioService.test.js
│   └── properties/              # Property-based tests
├── dist/                        # Production build output (generated)
├── index.html                   # HTML entry point
├── package.json                 # Dependencies and scripts
├── vite.config.js               # Vite configuration
└── README.md                    # This file
```

## Development

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)

### Getting Started

1. **Clone or download the project**

2. **Install Dependencies**
   ```bash
   npm install
   ```
   This will install all required packages including React, Vite, Vitest, and testing libraries.

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   - Opens development server at `http://localhost:5173`
   - Hot module replacement enabled for instant updates
   - Fast refresh for React components

4. **Run Tests**
   ```bash
   npm test
   ```
   Runs all tests once and exits.

5. **Run Tests in Watch Mode**
   ```bash
   npm run test:watch
   ```
   Runs tests in watch mode for active development.

6. **Build for Production**
   ```bash
   npm run build
   ```
   Creates optimized production build in the `dist/` folder.

7. **Preview Production Build**
   ```bash
   npm run preview
   ```
   Serves the production build locally for testing.

## Running Locally (No Server Required)

### For End Users

1. **Build the application** (if not already built):
   ```bash
   npm run build
   ```

2. **Navigate to the dist folder**:
   - The build process creates a `dist` folder with all necessary files

3. **Open in browser**:
   - **Option 1**: Double-click `dist/index.html`
   - **Option 2**: Right-click `dist/index.html` → "Open with" → Choose your browser
   - **Option 3**: Drag `dist/index.html` into an open browser window

4. **Enjoy!**
   - The app works completely offline
   - No internet connection required
   - No web server needed

### Browser Compatibility

The application is tested and works on modern browsers:

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| **Google Chrome** | 90+ | ✅ Recommended | Best performance and compatibility |
| **Microsoft Edge** | 90+ | ✅ Supported | Chromium-based, excellent support |
| **Mozilla Firefox** | 88+ | ✅ Supported | Full functionality |
| **Safari** | 14+ | ⚠️ Limited Testing | Should work but not extensively tested |
| **Internet Explorer** | Any | ❌ Not Supported | Use a modern browser instead |

**Required Browser Features:**
- HTML5 Audio API support
- ES6+ JavaScript support
- CSS Grid and Flexbox support
- Local file system access (file:// protocol)

**Note for Windows Users:**
- The app is optimized for Windows but works on any operating system
- Default browser on Windows 10/11 is Microsoft Edge (fully supported)

### Distribution
To share the app:
1. Zip the entire `dist` folder
2. Share with others
3. Recipients extract and open `index.html`

### Verification
- Check `BUILD_VERIFICATION.md` for detailed build configuration
- Check `dist/TEST_INSTRUCTIONS.md` for testing guidelines

## Technical Details

### Technology Stack

- **Frontend Framework**: React 19.2.0 (functional components with hooks)
- **Build Tool**: Vite 7.2.4 (fast development and optimized builds)
- **Testing Framework**: Vitest 4.0.15 (unit and property-based testing)
- **Testing Libraries**: 
  - @testing-library/react (component testing)
  - @testing-library/user-event (interaction simulation)
  - @testing-library/jest-dom (DOM matchers)
  - fast-check (property-based testing)
- **Audio**: HTML5 Audio API
- **Styling**: CSS with CSS Modules

### Configuration

- **Vite Config**: Configured with relative paths (`base: './'`) for local file system usage
- **Vitest Config**: Configured with jsdom environment and global test utilities
- **Test Setup**: Automatic cleanup after each test with @testing-library/react
- **Build Output**: Optimized static files with all assets bundled

### Key Features

- **No Server Required**: All assets are bundled locally with relative paths
- **Offline First**: No network requests during normal operation
- **Audio Caching**: Audio files are cached after first play for better performance
- **Responsive Design**: Works on various screen sizes
- **Child-Friendly UI**: Large buttons, bright colors, smooth animations

## Troubleshooting

### Audio Not Playing

**Problem**: Audio files don't play when clicking on cards.

**Solutions**:
- Ensure your browser allows audio playback (some browsers block autoplay)
- Check that audio files exist in the `public/audio/` directory
- Try clicking the card again (first click may need user interaction)
- Check browser console for error messages

### Images Not Loading

**Problem**: Images don't appear on word cards.

**Solutions**:
- Verify image files exist in `public/images/` directory
- Check that file paths in `src/data/words.json` match actual files
- Clear browser cache and reload
- Check browser console for 404 errors

### App Not Loading from dist/index.html

**Problem**: Opening `dist/index.html` shows a blank page.

**Solutions**:
- Ensure you've run `npm run build` first
- Check that `vite.config.js` has `base: './'` configured
- Try opening in a different browser
- Check browser console for errors
- Ensure all files in `dist/` folder are present

### Development Server Issues

**Problem**: `npm run dev` fails or shows errors.

**Solutions**:
- Delete `node_modules/` folder and run `npm install` again
- Clear npm cache: `npm cache clean --force`
- Ensure Node.js version is 18 or higher: `node --version`
- Check for port conflicts (default port is 5173)

## Contributing

This is an educational project. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build and verify: `npm run build`
6. Submit a pull request

## License

This project is created for educational purposes.

## Generating Real Audio Files

The app currently includes placeholder audio files. To generate real Hindi audio using AWS Polly:

### Quick Start
```bash
# Windows
setup_and_generate_audio.bat

# Linux/Mac
chmod +x setup_and_generate_audio.sh
./setup_and_generate_audio.sh
```

### Manual Generation
1. **Install dependencies**: `pip install boto3`
2. **Configure AWS**: `aws configure` (enter your AWS credentials)
3. **Generate audio**: `python generate_audio_polly.py`
4. **Rebuild app**: `npm run build`

### What You Need
- AWS Account (free tier eligible)
- AWS Access Key & Secret Key
- Python 3.7+
- Internet connection

### Cost
Approximately **$0.01** to generate all 94 audio files (essentially free with AWS free tier)

### Documentation
- **Quick Start**: See `AUDIO_QUICK_START.md`
- **Detailed Guide**: See `AUDIO_GENERATION_GUIDE.md`

The script generates:
- 42 character pronunciations (vowels + consonants)
- 34 word pronunciations
- 18 phrase pronunciations

All using AWS Polly's neural engine with the Aditi voice (native Hindi speaker).

## Additional Resources

- **Build Verification**: See `BUILD_VERIFICATION.md` for build configuration details
- **Asset Verification**: See `ASSET_VERIFICATION.md` for asset management
- **Assets Guide**: See `ASSETS_README.md` for information about audio and image assets
- **Audio Generation**: See `AUDIO_GENERATION_GUIDE.md` for AWS Polly setup
- **Testing**: See `FINAL_TEST_REPORT.md` for test results

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure all dependencies are installed correctly
4. Verify the build process completed successfully

---

**Made with ❤️ for young Hindi learners**
