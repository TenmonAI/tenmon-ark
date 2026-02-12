import { Router, type Request, type Response } from "express";

export const writerRouter = Router();

type Mode = "blog" | "research" | "official" | "lp" | "essay";

writerRouter.post("/writer/outline", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = String(body.threadId ?? "").trim();
    const mode = (String(body.mode ?? "research").trim() as Mode) || "research";
    const text = typeof body.text === "string" ? body.text : "";

    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (!text.trim()) return res.status(400).json({ ok: false, error: "text required" });

    // Deterministic outline templates (P0). No LLM. No DB.
    const baseTitle =
      mode === "lp"
        ? "提案の全体像"
        : mode === "official"
        ? "公式文書の骨格"
        : mode === "blog"
        ? "記事構成案"
        : mode === "essay"
        ? "随筆の章立て"
        : "研究アウトライン";

    const sections =
      mode === "lp"
        ? [
            { heading: "課題", goal: "現状の痛点を明確化する", evidenceRequired: true },
            { heading: "解決策", goal: "方針と全体設計を提示する", evidenceRequired: true },
            { heading: "根拠", goal: "引用・データで裏付ける", evidenceRequired: true },
            { heading: "導入手順", goal: "次の一手を具体化する", evidenceRequired: false },
          ]
        : mode === "official"
        ? [
            { heading: "目的", goal: "文書の目的を明文化する", evidenceRequired: false },
            { heading: "定義", goal: "用語と範囲を確定する", evidenceRequired: true },
            { heading: "本文", goal: "規定・方針を記述する", evidenceRequired: true },
            { heading: "付則", goal: "適用範囲・例外を整理する", evidenceRequired: false },
          ]
        : mode === "blog"
        ? [
            { heading: "導入", goal: "読者の関心を固定する", evidenceRequired: false },
            { heading: "要点", goal: "結論と重要点を提示する", evidenceRequired: false },
            { heading: "根拠", goal: "引用・具体で裏付ける", evidenceRequired: true },
            { heading: "まとめ", goal: "次の行動へ繋げる", evidenceRequired: false },
          ]
        : mode === "essay"
        ? [
            { heading: "発端", goal: "問いの起点を示す", evidenceRequired: false },
            { heading: "展開", goal: "観測と連想を繋ぐ", evidenceRequired: false },
            { heading: "照合", goal: "法則・根拠へ照らす", evidenceRequired: true },
            { heading: "結", goal: "余韻と結論を置く", evidenceRequired: false },
          ]
        : [
            { heading: "問題設定", goal: "問いと範囲を明確化する", evidenceRequired: false },
            { heading: "先行整理", goal: "既知情報を構造化する", evidenceRequired: true },
            { heading: "解析", goal: "法則・矛盾・依存を抽出する", evidenceRequired: true },
            { heading: "結論", goal: "整合した結論を提示する", evidenceRequired: false },
          ];

    return res.json({
      ok: true,
      threadId,
      mode,
      title: baseTitle,
      sections,
      modeTag: "DET",
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
