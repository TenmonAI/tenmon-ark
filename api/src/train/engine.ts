// Training Chat: Engine Integration (uses core engine without polluting production memory)

import { respond } from "../tenmon/respond.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import { getCurrentPersonaStateInternal } from "../persona/personaState.js";
import { addTrainingMessage } from "./session.js";
import type { TrainingIntent } from "./session.js";

// Track thinking axis transitions during training
const axisHistory = new Map<string, ThinkingAxis[]>();

/**
 * Execute training message through core engine
 * Returns response and captures thinking axis transitions
 * 
 * Note: Uses isolated session ID (train_${sessionId}) to prevent polluting production memory
 */
export function executeTrainingMessage(
  sessionId: string,
  message: string,
  intent: TrainingIntent,
  importance: number
): {
  response: string;
  thinkingAxis: ThinkingAxis;
  thinkingAxisTransitions: ThinkingAxis[];
} {
  // Use isolated training session ID to prevent polluting production memory
  const trainingSessionId = `train_${sessionId}`;

  // Get current thinking axis before processing
  const beforeState = getCurrentPersonaStateInternal();
  const beforeAxis = beforeState._thinkingAxis || "observational";

  // Execute through core engine (same as production)
  // Training session ID is isolated, so production memory is not affected
  const response = respond(message, trainingSessionId, "web");

  // Get thinking axis after processing
  const afterState = getCurrentPersonaStateInternal();
  const afterAxis = afterState._thinkingAxis || "observational";

  // Track axis transitions
  const history = axisHistory.get(sessionId) || [];
  history.push(beforeAxis);
  if (beforeAxis !== afterAxis) {
    history.push(afterAxis);
  }
  axisHistory.set(sessionId, history);

  // Get all transitions in this session
  const transitions = [...history];

  // Store in training session (temporary, not production memory)
  addTrainingMessage(
    sessionId,
    message,
    intent,
    importance,
    response,
    afterAxis,
    transitions
  );

  return {
    response,
    thinkingAxis: afterAxis,
    thinkingAxisTransitions: transitions,
  };
}

/**
 * Clear axis history for a session
 */
export function clearAxisHistory(sessionId: string): void {
  axisHistory.delete(sessionId);
}

