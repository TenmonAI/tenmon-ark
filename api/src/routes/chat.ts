import { Router, type Request, type Response } from "express";
import { naturalRouter } from "../persona/naturalRouter.js";

const router = Router();

type Mode = "NATURAL" | "HYBRID" | "GROUNDED";

type KuFrame = {
  stance: "ASK" | "ANSWER";
  reason: string;
  nextNeed?: string[];
};

function ku(stance: KuFrame["stance"], reason: string, nextNeed?: string[]): KuFrame {
  return { stance, reason, nextNeed };
}

function parseDocAndPageStrict(text: string): { doc: string | null; pdfPage: number | null } {
  const mDoc = text.match(/(?:^|\s)doc\s*[:=]\s*([^\s]+)/i);
  let doc = mDoc ? String(mDoc[1]).trim() : null;

  if (!doc) {
    const mPdf = text.match(/([^\s]+\.pdf)/i);
    if (mPdf) doc = String(mPdf[1]).trim();
  }

  const m = text.match(/pdfPage\s*[:=]\s*(\d{1,4})/i);
  const pdfPage = m ? Number(m[1]) : null;

  return { doc, pdfPage };
}

router.post("/chat", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const message = String(body.message ?? "").trim();
  const threadId = String(body.threadId ?? "default").trim();
  const timestamp = new Date().toISOString();

  if (!message) return res.status(400).json({ error: "message required", timestamp });

  // TENMON-ARK: req.body.mode は信用しない（calm/thinking 系の混入を防ぐ）
  const detailFlag = /#詳細/.test(message);
  const parsed = parseDocAndPageStrict(message);

  const mode: Mode =
    parsed.doc && parsed.pdfPage ? "GROUNDED" : detailFlag ? "HYBRID" : "NATURAL";

  // =========================
  // NATURAL
  // =========================
  if (mode === "NATURAL") {
    const nat = naturalRouter({ message, mode });
    const responseText = nat?.responseText || "Hello. How can I help you today?";
    return res.json({
      response: responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} }, // NATURAL frozen
      timestamp,
      threadId,
    });
  }

  // =========================
  // GROUNDED（doc/pdfPage 指定あり）
  // =========================
  if (mode === "GROUNDED") {
    const doc = parsed.doc!;
    const pdfPage = parsed.pdfPage!;
    const responseText = `（資料準拠）${doc} P${pdfPage} を指定として受け取りました。`;
    const result: any = {
      response: responseText,
      evidence: { doc, pdfPage },
      decisionFrame: { mode: "GROUNDED", intent: "chat", llm: null, ku: ku("ANSWER", "GROUNDED specified", []) },
      timestamp,
      threadId,
    };
    if (detailFlag) {
      result.detail =
        `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 根拠抽出は最小実装（fallback）`;
    }
    return res.json(result);
  }

  // =========================
  // HYBRID（#詳細 だが doc/pdfPage 未指定）
  // =========================
  const result: any = {
    response:
      "（資料準拠）doc/pdfPage が未指定です。\n" +
      "例）言霊秘書.pdf pdfPage=6 言灵とは？ #詳細\n",
    evidence: null,
    decisionFrame: {
      mode: "HYBRID",
      intent: "chat",
      llm: null,
      ku: ku("ASK", "need doc/pdfPage", ["doc", "pdfPage"]),
    },
    timestamp,
    threadId,
  };
  if (detailFlag) {
    result.detail =
      "#詳細\n- 状態: doc/pdfPage 未指定\n- 次の導線: doc/pdfPage を指定してください";
  }
  return res.json(result);
});

export default router;


