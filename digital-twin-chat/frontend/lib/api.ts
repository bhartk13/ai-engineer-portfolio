/**
 * API client for backend communication
 * This is a placeholder implementation - full implementation in task 6.3
 */

import { Message } from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Send a chat message to the backend
 */
export async function sendMessage(message: string, sessionId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

/**
 * Load conversation history from the backend
 */
export async function loadHistory(sessionId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // No history found, return empty array
      return [];
    }
    throw new Error(`Failed to load history: ${response.statusText}`);
  }

  const data = await response.json();
  return data.messages || [];
}
