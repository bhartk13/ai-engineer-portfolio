'use client';

import ChatInterface from '@/components/ChatInterface';
import { sendMessage, loadHistory } from '@/lib/api';

export default function Home() {
  return (
    <ChatInterface 
      onSendMessage={sendMessage}
      onLoadHistory={loadHistory}
    />
  );
}
