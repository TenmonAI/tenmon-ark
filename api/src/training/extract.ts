// Training Chat: Conversation Parsing and Rule Extraction (Deterministic, LLM-free)

import type { TrainingMessage } from "./storage.js";

/**
 * Parse conversation dump text into structured messages
 * Supports multiple formats:
 * - Structured format: [SESSION_TITLE], [CONTEXT], [LOG], [RULE_CANDIDATES]
 * - "User: ..." / "Assistant: ..."
 * - "ユーザー: ..." / "アシスタント: ..."
 * - JSON array [{role, content}]
 */
export function parseConversationDump(text: string): {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  extractedTitle?: string;
  context?: string;
  ruleCandidates?: string[];
} {
  const trimmed = text.trim();
  if (!trimmed) return { messages: [] };

  // Try JSON format first
  if (trimmed.startsWith("[") && trimmed.endsWith("]") && !trimmed.includes("[SESSION_TITLE]")) {
    try {
      const parsed = JSON.parse(trimmed) as Array<{ role?: string; content?: string }>;
      if (Array.isArray(parsed)) {
        return {
          messages: parsed
            .filter((item) => item.role && item.content)
            .map((item) => ({
              role: item.role as "user" | "assistant" | "system",
              content: String(item.content),
            })),
        };
      }
    } catch {
      // Not valid JSON, continue to text parsing
    }
  }

  // Parse structured format: [SESSION_TITLE], [CONTEXT], [LOG], [RULE_CANDIDATES]
  if (trimmed.includes("[SESSION_TITLE]") || trimmed.includes("[LOG]")) {
    let extractedTitle: string | undefined;
    let context: string | undefined;
    const ruleCandidates: string[] = [];
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

    // Extract [SESSION_TITLE]
    const titleMatch = trimmed.match(/\[SESSION_TITLE\]\s*\n(.+?)(?=\n\[|$)/is);
    if (titleMatch && titleMatch[1]) {
      extractedTitle = titleMatch[1].trim();
    }

    // Extract [CONTEXT]
    const contextMatch = trimmed.match(/\[CONTEXT\]\s*\n([\s\S]+?)(?=\n\[LOG\]|$)/is);
    if (contextMatch && contextMatch[1]) {
      context = contextMatch[1].trim();
    }

    // Extract [LOG] section
    const logMatch = trimmed.match(/\[LOG\]\s*\n([\s\S]+?)(?=\n\[RULE_CANDIDATES\]|$)/is);
    if (logMatch && logMatch[1]) {
      const logContent = logMatch[1];
      const logLines = logContent.split(/\n+/);

      for (const line of logLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Match patterns: "User:", "Assistant:", "ユーザー:", "アシスタント:", etc.
        const userPattern = /^(?:User|ユーザー|user|User:)\s*[:：]\s*(.+)$/i;
        const assistantPattern = /^(?:Assistant|アシスタント|assistant|Assistant:)\s*[:：]\s*(.+)$/i;
        const systemPattern = /^(?:System|システム|system|System:)\s*[:：]\s*(.+)$/i;

        if (userPattern.test(trimmedLine)) {
          const match = trimmedLine.match(userPattern);
          if (match && match[1]) {
            messages.push({ role: "user", content: match[1].trim() });
          }
        } else if (assistantPattern.test(trimmedLine)) {
          const match = trimmedLine.match(assistantPattern);
          if (match && match[1]) {
            messages.push({ role: "assistant", content: match[1].trim() });
          }
        } else if (systemPattern.test(trimmedLine)) {
          const match = trimmedLine.match(systemPattern);
          if (match && match[1]) {
            messages.push({ role: "system", content: match[1].trim() });
          }
        } else if (messages.length > 0) {
          // Continuation of previous message
          const lastMessage = messages[messages.length - 1];
          lastMessage.content += "\n" + trimmedLine;
        }
      }
    }

    // Extract [RULE_CANDIDATES] section
    const ruleMatch = trimmed.match(/\[RULE_CANDIDATES\]\s*\n([\s\S]+?)(?=\n\[|$)/is);
    if (ruleMatch && ruleMatch[1]) {
      const ruleContent = ruleMatch[1];
      const ruleLines = ruleContent.split(/\n+/);

      for (const line of ruleLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Match patterns: "- ルール:", "- 禁止:", "- 定義:", etc.
        if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•") || trimmedLine.startsWith("*")) {
          const ruleText = trimmedLine.replace(/^[-•*]\s*/, "").trim();
          if (ruleText.length > 0) {
            ruleCandidates.push(ruleText);
          }
        }
      }
    }

    return {
      messages,
      extractedTitle,
      context,
      ruleCandidates: ruleCandidates.length > 0 ? ruleCandidates : undefined,
    };
  }

  // Parse simple text format (fallback)
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
  const lines = trimmed.split(/\n+/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match patterns: "User:", "Assistant:", "ユーザー:", "アシスタント:", etc.
    const userPattern = /^(?:User|ユーザー|user|User:)\s*[:：]\s*(.+)$/i;
    const assistantPattern = /^(?:Assistant|アシスタント|assistant|Assistant:)\s*[:：]\s*(.+)$/i;
    const systemPattern = /^(?:System|システム|system|System:)\s*[:：]\s*(.+)$/i;

    if (userPattern.test(trimmedLine)) {
      const match = trimmedLine.match(userPattern);
      if (match && match[1]) {
        messages.push({ role: "user", content: match[1].trim() });
      }
    } else if (assistantPattern.test(trimmedLine)) {
      const match = trimmedLine.match(assistantPattern);
      if (match && match[1]) {
        messages.push({ role: "assistant", content: match[1].trim() });
      }
    } else if (systemPattern.test(trimmedLine)) {
      const match = trimmedLine.match(systemPattern);
      if (match && match[1]) {
        messages.push({ role: "system", content: match[1].trim() });
      }
    } else if (messages.length > 0) {
      // Continuation of previous message
      const lastMessage = messages[messages.length - 1];
      lastMessage.content += "\n" + trimmedLine;
    }
  }

  return { messages };
}

/**
 * Extract tags from text (simple regex-based extraction)
 */
function extractTags(text: string): string[] {
  // Extract words that appear multiple times (basic keyword detection)
  const words = text
    .replace(/[。、！？\n\r\t]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(w));

  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  // Return words that appear 2+ times, limited to 10 tags
  return Object.entries(wordCount)
    .filter(([_, count]) => count >= 2)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Classify rule type based on content
 */
function classifyRuleType(text: string): "vocabulary" | "policy" | "behavior" | "other" {
  const normalized = text.toLowerCase();

  // Vocabulary: contains word definitions, terminology
  if (
    normalized.includes("とは") ||
    normalized.includes("定義") ||
    normalized.includes("意味") ||
    normalized.includes("語彙") ||
    normalized.includes("用語")
  ) {
    return "vocabulary";
  }

  // Policy: contains rules, restrictions, must/must not
  if (
    normalized.includes("禁止") ||
    normalized.includes("絶対") ||
    normalized.includes("必須") ||
    normalized.includes("原則") ||
    normalized.includes("ポリシー") ||
    normalized.includes("ルール") ||
    normalized.includes("守る") ||
    normalized.includes("してはいけない") ||
    normalized.includes("must not") ||
    normalized.includes("must ")
  ) {
    return "policy";
  }

  // Behavior: contains behavioral patterns, how to act
  if (
    normalized.includes("振る舞い") ||
    normalized.includes("行動") ||
    normalized.includes("動作") ||
    normalized.includes("習慣") ||
    normalized.includes("癖") ||
    normalized.includes("behavior") ||
    normalized.includes("act") ||
    normalized.includes("should")
  ) {
    return "behavior";
  }

  return "other";
}

/**
 * Extract rules from conversation messages and explicit rule candidates (deterministic, LLM-free)
 */
export function extractRules(
  messages: TrainingMessage[],
  explicitRuleCandidates?: string[]
): Array<{
  type: "vocabulary" | "policy" | "behavior" | "other";
  title: string;
  rule_text: string;
  tags: string[];
  evidence_message_ids: string[];
  confidence: number;
}> {
  const rules: Array<{
    type: "vocabulary" | "policy" | "behavior" | "other";
    title: string;
    rule_text: string;
    tags: string[];
    evidence_message_ids: string[];
    confidence: number;
  }> = [];

  // Rule detection keywords
  const ruleKeywords = [
    "ルール",
    "禁止",
    "絶対",
    "最重要",
    "〜は",
    "〜とは",
    "定義",
    "原則",
    "守る",
    "must",
    "should",
    "禁止事項",
    "必須",
    "ポリシー",
  ];

  // Scan messages for rule candidates
  for (const msg of messages) {
    const content = msg.content;
    const normalized = content.toLowerCase();

    // Check if message contains rule keywords
    const hasRuleKeyword = ruleKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));

    if (hasRuleKeyword) {
      // Extract sentences that contain rule keywords
      const sentences = content.split(/[。\n]+/).filter((s) => s.trim().length > 0);

      for (const sentence of sentences) {
        const sentenceNormalized = sentence.toLowerCase();
        const hasKeyword = ruleKeywords.some((keyword) =>
          sentenceNormalized.includes(keyword.toLowerCase())
        );

        if (hasKeyword && sentence.trim().length > 10) {
          // Generate title (first 50 chars)
          const title = sentence.trim().substring(0, 50).replace(/\n/g, " ");

          // Classify type
          const type = classifyRuleType(sentence);

          // Extract tags
          const tags = extractTags(sentence);

          // Check if similar rule already exists
          const existingRuleIndex = rules.findIndex(
            (r) => r.rule_text === sentence.trim() || r.title === title
          );

          if (existingRuleIndex >= 0) {
            // Increment confidence
            rules[existingRuleIndex].confidence += 1;
            if (!rules[existingRuleIndex].evidence_message_ids.includes(msg.id)) {
              rules[existingRuleIndex].evidence_message_ids.push(msg.id);
            }
          } else {
            // Create new rule
            rules.push({
              type,
              title,
              rule_text: sentence.trim(),
              tags,
              evidence_message_ids: [msg.id],
              confidence: 1,
            });
          }
        }
      }
    }
  }

  // Process explicit rule candidates from [RULE_CANDIDATES] section
  if (explicitRuleCandidates && explicitRuleCandidates.length > 0) {
    for (const candidate of explicitRuleCandidates) {
      if (candidate.trim().length < 10) continue;

      // Generate title (first 50 chars)
      const title = candidate.trim().substring(0, 50).replace(/\n/g, " ");

      // Classify type
      const type = classifyRuleType(candidate);

      // Extract tags
      const tags = extractTags(candidate);

      // Check if similar rule already exists
      const existingRuleIndex = rules.findIndex(
        (r) => r.rule_text === candidate.trim() || r.title === title
      );

      if (existingRuleIndex >= 0) {
        // Increment confidence (explicit candidates have higher weight)
        rules[existingRuleIndex].confidence += 2;
      } else {
        // Create new rule with high confidence for explicit candidates
        rules.push({
          type,
          title,
          rule_text: candidate.trim(),
          tags,
          evidence_message_ids: [], // Explicit candidates don't have message evidence
          confidence: 3, // Higher confidence for explicit candidates
        });
      }
    }
  }

  return rules;
}

