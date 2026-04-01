import { randomUUID } from "node:crypto";
import { getDb } from "../db/index.js";

type PersonaProfileRow = {
  profile_id: string;
  assistant_call_name: string;
  user_call_name: string;
  forbidden_moves: string;
  worldview_constraints: string;
};

function parseJsonArrayV1(value: unknown): string[] {
  try {
    if (typeof value !== "string") return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export async function getActivePersonaProfileV1(): Promise<{
  profile_id: string;
  assistant_call_name: string;
  user_call_name: string;
  forbidden_moves: string[];
  worldview_constraints: string[];
} | null> {
  try {
    const db = getDb("kokuzo");
    const row = db
      .prepare(
        "SELECT profile_id, assistant_call_name, user_call_name, forbidden_moves, worldview_constraints FROM persona_profiles_v1 WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1"
      )
      .get() as PersonaProfileRow | undefined;
    if (!row) return null;
    return {
      profile_id: String(row.profile_id),
      assistant_call_name: String(row.assistant_call_name || "天聞"),
      user_call_name: String(row.user_call_name || "あなた"),
      forbidden_moves: parseJsonArrayV1(row.forbidden_moves),
      worldview_constraints: parseJsonArrayV1(row.worldview_constraints),
    };
  } catch {
    return null;
  }
}

export async function buildPersonaProjectionPromptV1(
  userId: string
): Promise<{ hard: string; soft: string }> {
  try {
    const db = getDb("kokuzo");
    const profile = await getActivePersonaProfileV1();
    const uid = String(userId || "default");
    const rows = db
      .prepare(
        "SELECT memory_type, memory_key, memory_value, is_hard_field FROM persona_memory_v1 WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC LIMIT 24"
      )
      .all(uid) as Array<{
      memory_type: string;
      memory_key: string;
      memory_value: string;
      is_hard_field: number;
    }>;

    const hardHints: string[] = [];
    const softHints: string[] = [];
    for (const r of rows) {
      const line = `${r.memory_type}:${r.memory_key}=${r.memory_value}`;
      if (Number(r.is_hard_field) === 1) hardHints.push(line);
      else softHints.push(line);
    }

    const hard = [
      `user_call_name=${profile?.user_call_name ?? "あなた"}`,
      `assistant_call_name=${profile?.assistant_call_name ?? "天聞"}`,
      `forbidden_moves=${JSON.stringify(profile?.forbidden_moves ?? [])}`,
      ...hardHints.slice(0, 12),
    ].join("\n");

    const soft = [
      "preferences_and_tone_hints:",
      ...softHints.slice(0, 12),
      `worldview_constraints=${JSON.stringify(profile?.worldview_constraints ?? [])}`,
    ].join("\n");

    return { hard, soft };
  } catch {
    return {
      hard: "user_call_name=あなた\nassistant_call_name=天聞\nforbidden_moves=[]",
      soft: "preferences_and_tone_hints:",
    };
  }
}

export async function insertPersonaMemoryV1(args: {
  user_id?: string;
  memory_type: string;
  memory_key: string;
  memory_value: string;
  is_hard_field?: boolean;
  confidence?: number;
  source?: string;
  is_pinned?: boolean;
}): Promise<string | null> {
  try {
    const db = getDb("kokuzo");
    const memory_id = randomUUID();
    db.prepare(
      "INSERT INTO persona_memory_v1 (memory_id, user_id, memory_type, memory_key, memory_value, is_hard_field, confidence, source, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    ).run(
      memory_id,
      String(args.user_id || "default"),
      String(args.memory_type),
      String(args.memory_key),
      String(args.memory_value),
      args.is_hard_field ? 1 : 0,
      Number.isFinite(Number(args.confidence)) ? Number(args.confidence) : 1,
      String(args.source || "explicit"),
      args.is_pinned ? 1 : 0
    );
    return memory_id;
  } catch {
    return null;
  }
}
