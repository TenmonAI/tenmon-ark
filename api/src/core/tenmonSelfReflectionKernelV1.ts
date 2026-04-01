import { getDb } from "../db/index.js";

export type ReflectionResultV1 = {
  center_fidelity: number;
  provenance_fidelity: number;
  beauty_score: number;
  continuity_score: number;
  law_usage_count: number;
  drift_detected: boolean;
  repair_suggestion: "none" | "deepen" | "shorten" | "add_evidence" | "clarify";
  learning_type: "1st_order" | "2nd_order";
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function scoreBeautyV1(surface: string): number {
  const text = String(surface ?? "");
  const paragraphs = text.split(/\n{2,}/).filter((x) => x.trim().length > 0).length;
  const qMarks = (text.match(/[?？]/g) ?? []).length;
  const sentences = text
    .split(/[。.!?？\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const uniq = new Set(sentences);
  const dupRate = sentences.length > 0 ? 1 - uniq.size / sentences.length : 0;
  const score = 0.4 * Math.min(1, paragraphs / 3) + 0.4 * (1 - dupRate) + 0.2 * (qMarks > 2 ? 0.4 : 1);
  return clamp01(score);
}

function detectDriftV1(surface: string): boolean {
  const t = String(surface ?? "");
  return /(宇宙|波動|覚醒|高次元|全ては愛|スピリチュアル)/.test(t);
}

export async function runSelfReflectionV1(args: {
  surface: string;
  centerKey: string | null;
  routeReason: string;
  lawsUsed: string[];
  threadId: string;
}): Promise<ReflectionResultV1> {
  const surface = String(args.surface ?? "");
  const center = String(args.centerKey ?? "").trim();

  const center_fidelity = center
    ? clamp01(surface.includes(center) ? 1 : 0.25)
    : clamp01(surface.length > 0 ? 0.5 : 0);
  const provenance_fidelity = /【天聞の所見】|出典|根拠|資料準拠/.test(surface) ? 1 : 0;
  const beauty_score = scoreBeautyV1(surface);
  const continuity_score = clamp01(surface.length >= 80 ? 0.8 : surface.length >= 40 ? 0.6 : 0.35);
  const law_usage_count = Array.isArray(args.lawsUsed) ? args.lawsUsed.length : 0;
  const drift_detected = detectDriftV1(surface);

  let repair_suggestion: ReflectionResultV1["repair_suggestion"] = "none";
  if (drift_detected) repair_suggestion = "clarify";
  else if (provenance_fidelity < 0.5) repair_suggestion = "add_evidence";
  else if (surface.length > 900) repair_suggestion = "shorten";
  else if (surface.length < 120) repair_suggestion = "deepen";

  return {
    center_fidelity,
    provenance_fidelity,
    beauty_score,
    continuity_score,
    law_usage_count,
    drift_detected,
    repair_suggestion,
    learning_type: "2nd_order",
  };
}

export async function record2ndOrderLearningV1(
  result: ReflectionResultV1,
  threadId: string
): Promise<void> {
  try {
    const db = getDb("kokuzo");
    db.prepare(
      "INSERT INTO kanagi_growth_ledger (thread_id, candidateType, payload, created_at) VALUES (?, ?, ?, datetime('now'))"
    ).run(
      String(threadId || "unknown"),
      "2nd_order_reflection",
      JSON.stringify(result)
    );
  } catch {
    // fail-open
  }
}
