# Digital Twin Chat UI Guide

## Overview

The Digital Twin Chat UI is a modern, clean chat interface built with Next.js, React, and Tailwind CSS.

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Digital Twin Chat                                      │
│  Chat with your AI digital twin                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────┐       │
│  │ You                                         │       │
│  │ Hello, how are you?                         │       │
│  │ 10:30 AM                                    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│       ┌─────────────────────────────────────────┐      │
│       │ Digital Twin                            │      │
│       │ I'm doing well, thank you for asking!   │      │
│       │ 10:30 AM                                │      │
│       └─────────────────────────────────────────┘      │
│                                                         │
│  [Loading indicator when waiting for response]         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐       │
│  │ Type your message...                        │       │
│  │ (Press Enter to send, Shift+Enter for      │       │
│  │  new line)                                  │       │
│  └─────────────────────────────────────────────┘ [Send]│
└─────────────────────────────────────────────────────────┘
```

## Color Scheme

### Light Mode
- Background: Gray-50 (#F9FAFB)
- Header: White with gray border
- User messages: Blue-600 (#2563EB) with white text
- Assistant messages: Gray-200 (#E5E7EB) with dark text
- Input area: White with gray border

### Dark Mode
- Background: Gray-900 (#111827)
- Header: Gray-800 with gray border
- User messages: Blue-600 (#2563EB) with white text
- Assistant messages: Gray-700 (#374151) with light text
- Input area: Gray-900 with gray border

## Components

### Header
- Fixed at top
- Shows app title and subtitle
- White background (light) / Gray-800 (dark)
- Border at bottom

### Messages Area
- Scrollable container
- Auto-scrolls to latest message
- Empty state when no messages
- Loading indicator (3 bouncing dots)

### Message Bubbles
- User messages: Right-aligned, blue background
- Assistant messages: Left-aligned, gray background
- Max width: 80% of container
- Rounded corners
- Shows sender name, content, and timestamp

### Input Area
- Fixed at bottom
- Multi-line textarea (3 rows)
- Send button on the right
- Disabled state during message sending
- Border at top

### Error Display
- Red background with border
- Appears above input area
- Dismissible with X button
- Shows error message

## Responsive Design

The UI is fully responsive:
- Mobile: Single column, full width messages
- Tablet: Optimized spacing
- Desktop: Centered layout with max-width

## Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Escape**: (Future) Clear input or close modals

## States

### Empty State
- Centered message: "No messages yet"
- Subtitle: "Start a conversation with your digital twin!"

### Loading State
- Animated bouncing dots
- Input disabled
- Send button disabled

### Error State
- Red alert banner above input
- Error message displayed
- Dismissible

### Disabled State
- Input grayed out
- Send button grayed out
- Cursor shows not-allowed

## Accessibility

- Semantic HTML elements
- Proper heading hierarchy
- Color contrast meets WCAG AA standards
- Keyboard navigation support
- Focus indicators on interactive elements

## Session Management

- Session ID automatically generated on first visit
- Stored in localStorage
- Persists across page refreshes
- Used to maintain conversation continuity

## Future Enhancements

Potential improvements for future tasks:
- Streaming responses with progressive rendering
- Message editing and deletion
- File attachments
- Voice input
- Message search
- Conversation export
- Multiple conversation threads
- User avatars
- Typing indicators
- Read receipts
- Message reactions
