# Simple Chat UI Guide

## Quick Start

### 1. Start the Backend Server

Make sure your backend is running:

```bash
cd digital-twin-chat/backend
python run_local.py
```

The server should be running on `http://localhost:8000`

### 2. Open the Chat UI

Simply open the `chat-ui.html` file in your web browser:

**Option A: Double-click the file**
- Navigate to `digital-twin-chat/chat-ui.html`
- Double-click to open in your default browser

**Option B: Use a command**
```bash
# From the digital-twin-chat directory
start chat-ui.html
```

### 3. Start Chatting!

- Type your message in the input box
- Press Enter or click "Send"
- Your digital twin will respond based on the LinkedIn PDF data

## Features

✅ **Clean, Modern Interface**: Beautiful gradient design with smooth animations  
✅ **Real-time Chat**: Instant messaging with typing indicators  
✅ **Session Persistence**: Your conversation is saved across page refreshes  
✅ **Error Handling**: Clear error messages if something goes wrong  
✅ **Responsive Design**: Works on desktop and mobile browsers  

## How It Works

1. **Session Management**: Each browser gets a unique session ID stored in localStorage
2. **API Communication**: Sends messages to `http://localhost:8000/api/chat`
3. **Conversation History**: The backend maintains your conversation history per session
4. **Persona Integration**: Responses are based on your LinkedIn PDF content

## Troubleshooting

### "Failed to send message" Error

**Problem**: The UI can't connect to the backend

**Solutions**:
1. Make sure the backend is running (`python run_local.py`)
2. Check that the server is on port 8000
3. Verify no firewall is blocking localhost connections

### CORS Errors in Browser Console

**Problem**: Browser blocks requests due to CORS policy

**Solution**: The backend is already configured to allow CORS from all origins. If you still see errors:
1. Make sure you're using `http://localhost:8000` (not `127.0.0.1`)
2. Check the backend logs for CORS-related messages

### No Response from Digital Twin

**Problem**: Messages send but no response comes back

**Solutions**:
1. Check the backend terminal for error messages
2. Verify your OpenAI API key is configured in `.env`
3. Check that `linkedin.pdf` is loaded correctly

### Session Not Persisting

**Problem**: Conversation resets when you refresh

**Solution**: 
- Check that your browser allows localStorage
- Try clearing browser cache and reloading

## Customization

### Change API URL

If your backend is on a different port, edit `chat-ui.html`:

```javascript
const API_URL = 'http://localhost:YOUR_PORT/api/chat';
```

### Modify Styling

All styles are in the `<style>` section of `chat-ui.html`. You can customize:
- Colors (search for `#667eea` and `#764ba2` for the gradient)
- Fonts (change `font-family`)
- Sizes (adjust `max-width`, `height`, etc.)

### Change Welcome Message

Edit the initial message in the HTML:

```html
<div>Hello! I'm your digital twin. Ask me anything...</div>
```

## Example Conversations

Try asking:
- "What's your professional background?"
- "Tell me about your experience with Python"
- "What technologies do you work with?"
- "Describe your communication style"
- "What are your key skills?"

## Technical Details

### Technologies Used
- **HTML5**: Structure
- **CSS3**: Styling with gradients and animations
- **Vanilla JavaScript**: No frameworks needed
- **Fetch API**: For HTTP requests
- **LocalStorage**: For session persistence

### Browser Compatibility
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

### File Size
- Single file: ~10KB
- No external dependencies
- Works offline (except API calls)

## Next Steps

This is a quick prototype. For a production-ready UI, consider:
1. Implementing Task 6 (Next.js frontend)
2. Adding authentication
3. Implementing streaming responses
4. Adding message history export
5. Supporting file uploads
6. Adding voice input/output

## Support

If you encounter issues:
1. Check the backend logs in the terminal
2. Open browser DevTools (F12) and check the Console tab
3. Verify the backend health: `http://localhost:8000/api/health`
4. Review the error messages in the UI

Enjoy chatting with your digital twin! 🚀
