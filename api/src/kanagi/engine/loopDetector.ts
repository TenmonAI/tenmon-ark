import crypto from "crypto";

type LoopState = {
  lastHash: string | null;
  count: number;
};

const loopStore = new Map<string, LoopState>();

const LOOP_THRESHOLD = 3; // 3回で執着とみなす（変更不可）

function hashSignature(input: string, roles: string[]): string {
  const raw = `${input}::${roles.join("|")}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * 同一構文＋同一役割の連続を検知する
 */
export function detectLoop(
  sessionId: string,
  input: string,
  roles: string[]
): {
  loopDetected: boolean;
  count: number;
} {
  const signature = hashSignature(input, roles);
  const state = loopStore.get(sessionId) ?? { lastHash: null, count: 0 };

  if (state.lastHash === signature) {
    state.count += 1;
  } else {
    state.lastHash = signature;
    state.count = 1;
  }

  loopStore.set(sessionId, state);

  return {
    loopDetected: state.count >= LOOP_THRESHOLD,
    count: state.count,
  };
}

