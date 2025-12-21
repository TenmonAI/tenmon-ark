// Training Chat: Storage Management

import { dbPrepare } from "../db/index.js";

export type TrainingMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: number;
};

export type TrainingSession = {
  id: string;
  title: string;
  created_at: number;
};

export type TrainingRule = {
  id: string;
  session_id: string;
  type: "vocabulary" | "policy" | "behavior" | "other";
  title: string;
  rule_text: string;
  tags: string[];
  evidence_message_ids: string[];
  confidence: number;
  created_at: number;
};

const insertSessionStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO training_sessions (id, title, created_at) VALUES (?, ?, ?)"
);

const insertMessageStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO training_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
);

const insertRuleStmt = dbPrepare(
  "kokuzo",
  "INSERT INTO training_rules (id, session_id, type, title, rule_text, tags, evidence_message_ids, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

const listSessionsStmt = dbPrepare(
  "kokuzo",
  "SELECT id, title, created_at FROM training_sessions ORDER BY created_at DESC"
);

const getSessionStmt = dbPrepare(
  "kokuzo",
  "SELECT id, title, created_at FROM training_sessions WHERE id = ?"
);

const getMessagesStmt = dbPrepare(
  "kokuzo",
  "SELECT id, session_id, role, content, created_at FROM training_messages WHERE session_id = ? ORDER BY created_at ASC"
);

const listRulesStmt = dbPrepare(
  "kokuzo",
  "SELECT id, session_id, type, title, rule_text, tags, evidence_message_ids, confidence, created_at FROM training_rules WHERE session_id = ? ORDER BY confidence DESC, created_at DESC"
);

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new training session
 */
export function createSession(title: string): TrainingSession {
  const id = generateId();
  const createdAt = Date.now();

  insertSessionStmt.run(id, title, createdAt);

  return {
    id,
    title,
    created_at: createdAt,
  };
}

/**
 * Add messages to a session
 */
export function addMessages(sessionId: string, messages: Array<{ role: "user" | "assistant" | "system"; content: string; created_at?: number }>): TrainingMessage[] {
  const now = Date.now();
  const savedMessages: TrainingMessage[] = [];

  for (const msg of messages) {
    const id = generateId();
    const createdAt = msg.created_at || now;

    insertMessageStmt.run(id, sessionId, msg.role, msg.content, createdAt);

    savedMessages.push({
      id,
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
      created_at: createdAt,
    });
  }

  return savedMessages;
}

/**
 * List all training sessions
 */
export function listSessions(): TrainingSession[] {
  const rows = listSessionsStmt.all() as Array<{
    id: string;
    title: string;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
  }));
}

/**
 * Get a training session with messages
 */
export function getSession(sessionId: string): {
  session: TrainingSession | null;
  messages: TrainingMessage[];
} {
  const sessionRow = getSessionStmt.get(sessionId) as
    | { id: string; title: string; created_at: number }
    | undefined;

  if (!sessionRow) {
    return { session: null, messages: [] };
  }

  const messageRows = getMessagesStmt.all(sessionId) as Array<{
    id: string;
    session_id: string;
    role: string;
    content: string;
    created_at: number;
  }>;

  return {
    session: {
      id: sessionRow.id,
      title: sessionRow.title,
      created_at: sessionRow.created_at,
    },
    messages: messageRows.map((row) => ({
      id: row.id,
      session_id: row.session_id,
      role: row.role as "user" | "assistant" | "system",
      content: row.content,
      created_at: row.created_at,
    })),
  };
}

/**
 * Save training rules
 */
export function saveRules(sessionId: string, rules: Array<{
  type: "vocabulary" | "policy" | "behavior" | "other";
  title: string;
  rule_text: string;
  tags: string[];
  evidence_message_ids: string[];
  confidence: number;
}>): TrainingRule[] {
  const now = Date.now();
  const savedRules: TrainingRule[] = [];

  for (const rule of rules) {
    const id = generateId();

    insertRuleStmt.run(
      id,
      sessionId,
      rule.type,
      rule.title,
      rule.rule_text,
      JSON.stringify(rule.tags),
      JSON.stringify(rule.evidence_message_ids),
      rule.confidence,
      now
    );

    savedRules.push({
      id,
      session_id: sessionId,
      type: rule.type,
      title: rule.title,
      rule_text: rule.rule_text,
      tags: rule.tags,
      evidence_message_ids: rule.evidence_message_ids,
      confidence: rule.confidence,
      created_at: now,
    });
  }

  return savedRules;
}

/**
 * List rules for a session
 */
export function listRules(sessionId: string): TrainingRule[] {
  const rows = listRulesStmt.all(sessionId) as Array<{
    id: string;
    session_id: string;
    type: string;
    title: string;
    rule_text: string;
    tags: string;
    evidence_message_ids: string;
    confidence: number;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    session_id: row.session_id,
    type: row.type as "vocabulary" | "policy" | "behavior" | "other",
    title: row.title,
    rule_text: row.rule_text,
    tags: JSON.parse(row.tags || "[]") as string[],
    evidence_message_ids: JSON.parse(row.evidence_message_ids || "[]") as string[],
    confidence: row.confidence,
    created_at: row.created_at,
  }));
}

