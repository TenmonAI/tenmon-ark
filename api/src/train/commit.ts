// Training Chat: Commit to KOKŪZŌ Seeds

import type { TrainingMessage } from "./session.js";
import { getSessionMessages, clearTrainingSession } from "./session.js";
import { dbPrepare } from "../db/index.js";

export type CommitPolicy = "save" | "compress" | "discard";

const insertSeedStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO kokuzo_seeds (source_type, source_id, essence, ruleset, created_at) VALUES (?, ?, ?, ?, ?)"
);

/**
 * Generate essence from training messages (compressed meaning)
 */
function generateEssence(messages: TrainingMessage[]): string {
  // Extract high-importance messages (importance >= 4)
  const importantMessages = messages.filter((m) => m.importance >= 4);

  if (importantMessages.length === 0) {
    // Fallback: use all messages
    return messages
      .map((m) => `${m.intent}: ${m.message.substring(0, 100)}`)
      .join(" | ")
      .substring(0, 500);
  }

  // Compress important messages
  return importantMessages
    .map((m) => `${m.intent}: ${m.message.substring(0, 150)}`)
    .join(" | ")
    .substring(0, 500);
}

/**
 * Generate ruleset from training messages (extracted behavioral rules)
 */
function generateRuleset(messages: TrainingMessage[]): Record<string, unknown> {
  // Count thinking axis transitions
  const axisCounts: Record<string, number> = {};
  const intentCounts: Record<string, number> = {};

  for (const msg of messages) {
    axisCounts[msg.thinkingAxis] = (axisCounts[msg.thinkingAxis] || 0) + 1;
    intentCounts[msg.intent] = (intentCounts[msg.intent] || 0) + 1;
  }

  // Extract dominant patterns
  const dominantAxis = Object.entries(axisCounts)
    .sort(([_, a], [__, b]) => b - a)[0]?.[0] || "observational";

  const dominantIntent = Object.entries(intentCounts)
    .sort(([_, a], [__, b]) => b - a)[0]?.[0] || "teach";

  // Calculate average importance
  const avgImportance =
    messages.reduce((sum, m) => sum + m.importance, 0) / messages.length;

  return {
    messageCount: messages.length,
    dominantAxis,
    dominantIntent,
    averageImportance: Math.round(avgImportance * 10) / 10,
    axisTransitions: messages.map((m) => m.thinkingAxisTransitions),
  };
}

/**
 * Commit training session to KOKŪZŌ seed
 */
export function commitTrainingSession(
  sessionId: string,
  policy: CommitPolicy
): {
  success: boolean;
  seedId?: number;
  message?: string;
} {
  if (policy === "discard") {
    clearTrainingSession(sessionId);
    return {
      success: true,
      message: "Session discarded (not persisted)",
    };
  }

  const messages = getSessionMessages(sessionId);
  if (messages.length === 0) {
    return {
      success: false,
      message: "No messages to commit",
    };
  }

  let messagesToCommit: TrainingMessage[];

  if (policy === "compress") {
    // Compress: take only high-importance messages (importance >= 3)
    messagesToCommit = messages.filter((m) => m.importance >= 3);
    if (messagesToCommit.length === 0) {
      // Fallback: use all if none meet threshold
      messagesToCommit = messages;
    }
  } else {
    // save: commit all messages
    messagesToCommit = messages;
  }

  const essence = generateEssence(messagesToCommit);
  const ruleset = generateRuleset(messagesToCommit);

  const timestamp = new Date().toISOString();
  const result = insertSeedStmt.run(
    "chat",
    sessionId, // source_id is session_id for chat seeds
    essence,
    JSON.stringify(ruleset),
    timestamp
  ) as { lastInsertRowid: number };

  // Clear session after successful commit
  clearTrainingSession(sessionId);

  return {
    success: true,
    seedId: Number(result.lastInsertRowid),
    message: `Committed ${messagesToCommit.length} messages as KOKŪZŌ seed`,
  };
}

