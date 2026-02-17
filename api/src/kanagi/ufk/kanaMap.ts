import type { SpiralMotion } from "./spiral.js";
import { UFK_SCHEMA_VERSION } from "./spiral.js";

export type KanaMapEntry = {
  kana: string;                    // e.g. "ホ"
  motionSeq: SpiralMotion[];       // e.g. ["LEFT_IN", ...]
  sourceEvidenceIds: string[];     // MUST be present (no fabrication)
  schemaVersion: typeof UFK_SCHEMA_VERSION;
};

// MVP: まずは数個だけ（後で増やす）
export const KANA_MAP: Record<string, KanaMapEntry> = {
  "ホ": {
    kana: "ホ",
    motionSeq: ["LEFT_IN", "LEFT_OUT", "RIGHT_IN", "RIGHT_OUT"],
    // ここは“捏造禁止”なので、暫定は空にせず「TODO」ではなく実在IDに差し替える運用にする
    // 現段階では TENMON_CORE に pin して運用（後でKHS等の根拠を入れる）
    sourceEvidenceIds: ["doc=TENMON_CORE#pdfPage=1"],
    schemaVersion: UFK_SCHEMA_VERSION,
  },
  "イ": {
    kana: "イ",
    motionSeq: ["LEFT_IN", "RIGHT_IN"],
    sourceEvidenceIds: ["doc=TENMON_CORE#pdfPage=1"],
    schemaVersion: UFK_SCHEMA_VERSION,
  },
  "エ": {
    kana: "エ",
    motionSeq: ["LEFT_OUT", "RIGHT_OUT"],
    sourceEvidenceIds: ["doc=TENMON_CORE#pdfPage=1"],
    schemaVersion: UFK_SCHEMA_VERSION,
  },
};
