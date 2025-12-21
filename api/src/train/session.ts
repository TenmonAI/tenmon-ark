// Training Chat: Session-based Temporary Memory

import type { ThinkingAxis } from "../persona/thinkingAxis.js";

export type TrainingIntent = "teach" | "question" | "verify" | "correct";

export type TrainingMessage = {
  id: string;
  timestamp: string;
  message: string;
  intent: TrainingIntent;
  importance: number; // 1-5
  response: string;
  thinkingAxis: ThinkingAxis;
  thinkingAxisTransitions: ThinkingAxis[];
};

export type TrainingSession = {
  sessionId: string;
  messages: TrainingMessage[];
  createdAt: string;
  lastUpdated: string;
};

// In-memory session store (NOT persisted to production memory)
const sessions = new Map<string, TrainingSession>();

/**
 * Create or get a training session
 */
export function getOrCreateSession(sessionId: string): TrainingSession {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const session: TrainingSession = {
    sessionId,
    messages: [],
    createdAt: now,
    lastUpdated: now,
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Add a message to a training session
 */
export function addTrainingMessage(
  sessionId: string,
  message: string,
  intent: TrainingIntent,
  importance: number,
  response: string,
  thinkingAxis: ThinkingAxis,
  thinkingAxisTransitions: ThinkingAxis[]
): TrainingMessage {
  const session = getOrCreateSession(sessionId);

  const trainingMessage: TrainingMessage = {
    id: `${sessionId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    message,
    intent,
    importance,
    response,
    thinkingAxis,
    thinkingAxisTransitions,
  };

  session.messages.push(trainingMessage);
  session.lastUpdated = new Date().toISOString();

  return trainingMessage;
}

/**
 * Get a training session
 */
export function getTrainingSession(sessionId: string): TrainingSession | null {
  return sessions.get(sessionId) || null;
}

/**
 * Clear a training session (discard)
 */
export function clearTrainingSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get all messages in a session
 */
export function getSessionMessages(sessionId: string): TrainingMessage[] {
  const session = sessions.get(sessionId);
  return session ? session.messages : [];
}

