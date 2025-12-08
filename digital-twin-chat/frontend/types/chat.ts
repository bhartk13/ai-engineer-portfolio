/**
 * Type definitions for chat components
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  timestamp: string;
}
