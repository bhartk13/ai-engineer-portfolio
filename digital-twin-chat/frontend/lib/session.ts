/**
 * Session management utilities for localStorage
 */

const SESSION_KEY = 'digital-twin-session-id';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get the current session ID from localStorage, or generate a new one
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Set a new session ID in localStorage
 */
export function setSessionId(sessionId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.setItem(SESSION_KEY, sessionId);
}

/**
 * Clear the current session ID from localStorage
 */
export function clearSessionId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem(SESSION_KEY);
}
