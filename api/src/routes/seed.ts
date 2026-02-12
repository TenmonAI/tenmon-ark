import { Router, type Request, type Response } from "express";

type SeedMsg = { role: string; text: string };
export const seedRouter = Router();

seedRouter.post("/seed/compress", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const threadId = String(body.threadId ?? "").trim();
    const messages = Array.isArray(body.messages) ? (body.messages as SeedMsg[]) : [];

    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    if (messages.length === 0) return res.status(400).json({ ok: false, error: "messages required" });

    const lastUser = [...messages].reverse().find((m) => m?.role === "user" && typeof m.text === "string");
    const lastTenmon = [...messages].reverse().find((m) => m?.role !== "user" && typeof m.text === "string");

    const u = (lastUser?.text ?? "").trim();
    const a = (lastTenmon?.text ?? "").trim();
    const summary = [u ? `User:${u}` : "", a ? `Tenmon:${a}` : ""].filter(Boolean).join(" / ").slice(0, 400);

    const tags: string[] = [];
    if (u.includes("迷")) tags.push("迷い");
    if (u.includes("断捨離")) tags.push("断捨離");
    if (a.includes("基準")) tags.push("基準");
    if (tags.length === 0) tags.push("seed");

    return res.json({ ok: true, threadId, summary, tags, mode: "DET", saved: false });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
