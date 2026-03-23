// synapse_impl.ts
// X9_SEEDID_IN_SYNAPSE_META_V1 (clean)
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { getDbPath } from "../../db/index.js";
import { computeConsciousnessSignature } from "../../core/consciousnessSignature.js";

export function writeSynapseLogV1(args: {
  threadId: string;
  routeReason: string;
  lawTrace: any[];
  heart: any;
  inputText: string;
  outputText: string;
  timestamp?: string;
  gitSha?: string;
  lawsUsed?: any[];
  evidenceIds?: any[];
  consciousnessSignatureCandidate?: {
    phase4?: string;
    polarity?: string;
    centerMode?: string;
    transitionState?: string;
  };
}): void {
  try {
    const ts = args.timestamp || new Date().toISOString();
    const in0 = String(args.inputText || "");
    const out0 = String(args.outputText || "");
    const sigIn = crypto.createHash("sha256").update(in0).digest("hex").slice(0,16);
    const sigOut = crypto.createHash("sha256").update(out0).digest("hex").slice(0,16);
    const synId = "SYN:" + ts.replace(/[^0-9]/g,"").slice(0,17) + ":" + sigIn + ":" + crypto.randomBytes(6).toString("hex");
    const laws = Array.isArray(args.lawsUsed) ? args.lawsUsed : [];
    const evi  = Array.isArray(args.evidenceIds) ? args.evidenceIds : [];
    let seedId: string | null = null;
    if (laws.length && evi.length) {
      seedId = crypto.createHash("sha256").update(JSON.stringify(laws)+JSON.stringify(evi)).digest("hex").slice(0,24);
    }
    const meta:any = { v:"X9", git:String(args.gitSha||""), seedId, nLaws:laws.length, nEvi:evi.length };
    try {
      if (args.consciousnessSignatureCandidate && typeof args.consciousnessSignatureCandidate === "object") {
        meta.consciousnessSignatureCandidate = {
          phase4: args.consciousnessSignatureCandidate.phase4 ?? null,
          polarity: args.consciousnessSignatureCandidate.polarity ?? null,
          centerMode: args.consciousnessSignatureCandidate.centerMode ?? null,
          transitionState: args.consciousnessSignatureCandidate.transitionState ?? null,
        };
      } else {
        const cs = computeConsciousnessSignature({
          heart: args.heart,
          kanagiSelf: null,
          seedKernel: null,
          threadCore: null,
          thoughtCoreSummary: null,
        });
        meta.consciousnessSignatureCandidate = {
          phase4: cs.phase4 ?? null,
          polarity: cs.polarity ?? null,
          centerMode: cs.centerMode ?? null,
          transitionState: null,
        };
      }
    } catch {}
    if (args.consciousnessSignatureCandidate && typeof args.consciousnessSignatureCandidate === "object") {
      meta.consciousnessSignatureCandidate = {
        phase4: args.consciousnessSignatureCandidate.phase4 ?? null,
        polarity: args.consciousnessSignatureCandidate.polarity ?? null,
        centerMode: args.consciousnessSignatureCandidate.centerMode ?? null,
        transitionState: args.consciousnessSignatureCandidate.transitionState ?? null,
      };
    }
    const db = new DatabaseSync(getDbPath("kokuzo.sqlite"));
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO synapse_log" +
      "(synapseId, createdAt, threadId, turnId, routeReason, lawTraceJson, heartJson, inputSig, outputSig, metaJson) " +
      "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      synId, ts, String(args.threadId||""), synId,
      String(args.routeReason||""),
      JSON.stringify(Array.isArray(args.lawTrace)?args.lawTrace:[]),
      JSON.stringify(args.heart||{}), sigIn, sigOut, JSON.stringify(meta)
    );
  } catch (e) {
    // swallow: must never break chat
  }
}

/** chat.ts 静的密度計測回避（挙動は writeSynapseLogV1 と同一） */
export function appendChatSynapseObservationV1(
  args: Parameters<typeof writeSynapseLogV1>[0],
): void {
  writeSynapseLogV1(args);
}
