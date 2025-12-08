# Chat UI Components

This directory contains the React components for the Digital Twin Chat interface.

## Components

### ChatInterface
The main chat interface component that orchestrates the entire chat experience.

**Props:**
- `onSendMessage: (message: string, sessionId: string) => Promise<string>` - Callback to send messages to the backend
- `onLoadHistory?: (sessionId: string) => Promise<Message[]>` - Optional callback to load conversation history

**Features:**
- Manages conversation state
- Handles session ID via localStorage
- Auto-scrolls to latest messages
- Displays loading states
- Shows error messages
- Loads conversation history on mount

### MessageBubble
Displays individual chat messages with appropriate styling.

**Props:**
- `message: Message` - The message object to display

**Features:**
- Different styling for user vs assistant messages
- Displays sender name
- Shows timestamp
- Supports multi-line text with proper wrapping

### ChatInput
Input component for composing and sending messages.

**Props:**
- `onSendMessage: (message: string) => void` - Callback when user sends a message
- `disabled?: boolean` - Whether the input is disabled (e.g., during loading)

**Features:**
- Multi-line textarea
- Send button
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Disabled state during message sending
- Auto-clears after sending

## Session Management

Session IDs are managed via localStorage using utilities in `lib/session.ts`:
- `getSessionId()` - Gets or creates a session ID
- `generateSessionId()` - Generates a new unique session ID
- `setSessionId(id)` - Sets a specific session ID
- `clearSessionId()` - Clears the current session

## API Integration

The components integrate with the backend via `lib/api.ts`:
- `sendMessage(message, sessionId)` - Sends a message to the backend
- `loadHistory(sessionId)` - Loads conversation history

## Usage Example

```tsx
import ChatInterface from '@/components/ChatInterface';
import { sendMessage, loadHistory } from '@/lib/api';

export default function ChatPage() {
  return (
    <ChatInterface 
      onSendMessage={sendMessage}
      onLoadHistory={loadHistory}
    />
  );
}
```

## Styling

Components use Tailwind CSS for styling with support for dark mode. The design follows these principles:
- Clean, modern interface
- Clear visual distinction between user and assistant messages
- Responsive layout
- Accessible color contrast
- Smooth animations and transitions
