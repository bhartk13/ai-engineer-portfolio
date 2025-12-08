# Digital Twin Chat - Testing Guide

## 🚀 Servers Running

Both servers are now running and ready for testing!

### Backend API
- **URL**: http://localhost:8000
- **Status**: ✅ Running
- **API Docs**: http://localhost:8000/docs
- **Environment**: Local
- **Persona**: linkedin.pdf loaded

### Frontend UI
- **URL**: http://localhost:3000
- **Status**: ✅ Running
- **Framework**: Next.js 16.0.7 with Turbopack

## 🧪 How to Test

### 1. Open the Chat UI
Open your browser and navigate to:
```
http://localhost:3000
```

### 2. What You Should See
- A clean chat interface with header "Digital Twin Chat"
- Empty state message: "No messages yet"
- Text input area at the bottom
- Send button

### 3. Test Basic Chat
1. Type a message in the input box (e.g., "Hello, who are you?")
2. Press Enter or click the Send button
3. You should see:
   - Your message appear on the right (blue bubble)
   - A loading indicator (3 bouncing dots)
   - The AI response appear on the left (gray bubble)

### 4. Test Conversation Continuity
1. Send a message: "My name is Alice"
2. Wait for response
3. Send another message: "What is my name?"
4. The AI should remember and reference "Alice"

### 5. Test Session Persistence
1. Send a few messages
2. Refresh the page (F5)
3. Your conversation history should reload automatically

### 6. Test Error Handling
1. Stop the backend server (Ctrl+C in backend terminal)
2. Try sending a message
3. You should see a red error banner
4. Restart the backend and try again

### 7. Test Dark Mode
1. Change your system theme to dark mode
2. The UI should automatically switch to dark theme
3. All colors should remain readable

## ✨ Features to Test

### Message Display
- ✅ User messages appear on the right (blue)
- ✅ AI messages appear on the left (gray)
- ✅ Timestamps show for each message
- ✅ Long messages wrap properly
- ✅ Multi-line messages display correctly

### Input Area
- ✅ Type in the textarea
- ✅ Press Enter to send
- ✅ Press Shift+Enter for new line
- ✅ Input clears after sending
- ✅ Input disables while loading

### Loading States
- ✅ Animated dots while waiting for response
- ✅ Input disabled during loading
- ✅ Send button disabled during loading

### Error Handling
- ✅ Error banner appears on failure
- ✅ Error message is user-friendly
- ✅ Error can be dismissed with X button

### Session Management
- ✅ Session ID generated automatically
- ✅ Stored in localStorage
- ✅ Persists across page refreshes
- ✅ Used for conversation continuity

## 🔍 Debugging

### Check Browser Console
Open Developer Tools (F12) and check the Console tab for:
- API requests to http://localhost:8000/api/chat
- Session ID logs
- Any error messages

### Check Network Tab
In Developer Tools, go to Network tab to see:
- POST requests to /api/chat
- Response status codes
- Request/response payloads

### Check Backend Logs
Look at the backend terminal for:
- Incoming API requests
- LLM interactions
- Memory storage operations
- Any errors or warnings

## 📝 Sample Test Conversation

Try this conversation to test all features:

1. **You**: "Hello! What can you tell me about yourself?"
   - Tests: Basic chat, persona loading

2. **You**: "What are your main skills?"
   - Tests: Persona content in responses

3. **You**: "My favorite color is blue"
   - Tests: Context storage

4. **You**: "What's my favorite color?"
   - Tests: Memory retrieval, conversation continuity

5. Refresh the page
   - Tests: Session persistence

6. **You**: "Do you remember what we talked about?"
   - Tests: History loading after refresh

## 🐛 Known Limitations

Current implementation (Task 6.2):
- No streaming support yet (Task 6.4)
- Basic error handling (Task 6.3 will improve)
- No retry logic yet (Task 6.3)
- No message editing/deletion
- No file attachments

## 🎯 Success Criteria

The chat UI is working correctly if:
- ✅ Messages send and receive successfully
- ✅ Conversation history persists
- ✅ Loading states display properly
- ✅ Errors are handled gracefully
- ✅ Session management works
- ✅ UI is responsive and looks good
- ✅ Dark mode works

## 🛑 Stopping the Servers

When you're done testing:

1. Stop the frontend: Press Ctrl+C in the frontend terminal
2. Stop the backend: Press Ctrl+C in the backend terminal

Or use the Kiro IDE to stop the background processes.

## 📞 Need Help?

If something isn't working:
1. Check both servers are running
2. Check browser console for errors
3. Check backend logs for errors
4. Verify .env file exists in frontend/
5. Verify OpenAI API key is configured in backend/.env

Enjoy testing your Digital Twin Chat! 🎉
