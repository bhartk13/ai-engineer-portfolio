# Quick Test Guide - Hindi Learning App

## How to Test the Application

### Option 1: Test the Built Version (Recommended for Offline Testing)

1. **Open the application:**
   ```
   Navigate to: hindi-learning-app/dist/
   Double-click: index.html
   ```

2. **Test offline functionality:**
   - Disconnect your WiFi/network
   - Open dist/index.html in your browser
   - Navigate through all modules
   - Verify everything works without internet

### Option 2: Test with Development Server

1. **Start the dev server:**
   ```bash
   cd hindi-learning-app
   npm run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:5173/
   ```

3. **Test the application:**
   - Click through all three modules (Alphabet, Words, Phrases)
   - Click on character cards to test audio
   - Click on word cards to test audio
   - Use back buttons to return to main menu
   - Switch between word categories

## What to Test

### ✅ Main Menu
- [ ] Three colorful buttons visible
- [ ] Buttons respond to hover
- [ ] Clicking each button navigates to correct module

### ✅ Alphabet Module
- [ ] Grid of Hindi characters displays
- [ ] Each card shows Hindi character + romanization
- [ ] Cards have colorful backgrounds
- [ ] Clicking a card plays audio (placeholder audio)
- [ ] Back button returns to main menu

### ✅ Words Module
- [ ] Category buttons visible (Animals, Colors, Numbers, Family)
- [ ] Default category shows words
- [ ] Each card shows: image, Hindi word, English translation
- [ ] Clicking category filters words
- [ ] Clicking card plays audio (placeholder audio)
- [ ] Back button returns to main menu

### ⚠️ Phrases Module
- [ ] Shows "Coming soon..." placeholder
- [ ] Back button returns to main menu
- [ ] Note: Not yet implemented (Task 8)

## Browser Testing

Test in these browsers:
- [ ] Chrome
- [ ] Firefox
- [ ] Edge

For each browser, verify:
- [ ] Application loads correctly
- [ ] Navigation works
- [ ] Images display
- [ ] Audio attempts to play (may be silent with placeholders)
- [ ] No console errors (press F12 to open DevTools)

## Offline Testing

1. **Disconnect network:**
   - Turn off WiFi
   - Or disconnect ethernet cable

2. **Open application:**
   - Navigate to dist/index.html
   - Double-click to open in browser

3. **Verify:**
   - [ ] Application loads
   - [ ] All images display
   - [ ] Navigation works
   - [ ] No network errors in console

## Expected Results

### ✅ Should Work
- Main menu navigation
- Module navigation
- Back button functionality
- Image loading
- Character and word display
- Category filtering
- Smooth animations
- Offline functionality

### ⚠️ Known Limitations
- Audio files are 30-byte placeholders (won't produce sound)
- Phrases module shows placeholder (Task 8 not implemented)
- Images are simple SVG placeholders

## Troubleshooting

### Application won't load
- Make sure you're opening dist/index.html (not src/index.html)
- Try a different browser
- Check browser console for errors (F12)

### Images not loading
- Verify dist/images/ folder exists
- Check browser console for 404 errors
- Ensure you're opening from dist/ folder

### Audio not playing
- This is expected - audio files are placeholders
- Check browser console for errors
- Verify dist/audio/ folder exists

## Quick Commands

```bash
# Run all tests
npm run test

# Build for production
npm run build

# Start dev server
npm run dev

# Run tests in watch mode
npm run test:watch
```

## Test Results

All automated tests pass: ✅ 31/31

See FINAL_TEST_REPORT.md for detailed results.
