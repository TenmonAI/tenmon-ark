import { Router, type IRouter, type Request, type Response } from "express";
import { kanagiThink } from "../kanagi/kanagiThink.js";

const router: IRouter = Router();

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const mode = req.query.mode || req.body.mode;
    const message = req.body.message || "";

    if (!message || typeof message !== "string") {
      return res.json({
        reply: "メッセージが必要です。何かお聞きしたいことがあれば教えてください。",
      });
    }

    // THINK モードの場合：天津金木思考ロジックを使用
    if (mode === "think" || mode === "THINK" || !mode) {
      const reply = await kanagiThink(message);
      return res.json({ reply });
    }

    // JUDGE モード（後回し）：仮の判断文を返す
    if (mode === "judge" || mode === "JUDGE") {
      return res.json({
        reply: `【JUDGE】「${message}」を評価します（JUDGEモードは今後実装予定です）`,
      });
    }

    // その他のモード：THINK として処理
    const reply = await kanagiThink(message);
    return res.json({ reply });

  } catch (err: any) {
    // エラー時も必ず reply を返す（UIが沈黙しないようにする）
    console.error("[CHAT-ERROR]", err);
    const message = req.body.message || "";
    return res.json({
      reply: `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${String(message).substring(0, 50)}${String(message).length > 50 ? "..." : ""}」について、改めて考えさせてください。`,
    });
  }
});

export default router;
