import { Router } from "express";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { verifyRuntimeIntegrity } from "../core/taiFreeze.js";

const router = Router();

// POST /api/kanagi/reason
router.post("/kanagi/reason", async (req, res) => {
  try {
    const input = String(req.body.input ?? "");
    const sessionId = String(req.body.session_id ?? `kanagi_${Date.now()}`);

    console.log(`[KANAGI] Input: ${input} (Session: ${sessionId})`);

    // Tai-Freeze 整合性チェック
    if (verifyRuntimeIntegrity && !verifyRuntimeIntegrity()) {
      console.error("[TAI-ALERT] Integrity violation");
      return res.status(503).json({
        error: "SYSTEM_SAFE_MODE",
        provisional: true
      });
    }

    const result = await runKanagiReasoner(input, sessionId);

    res.json({
      session_id: sessionId,
      observation: result.observationCircle,
      spiral: result.spiral,
      trace: result,
      provisional: true
    });

  } catch (err) {
    console.error("[KANAGI-ERROR]", err);
    res.status(500).json({
      error: "KANAGI_REASONING_FAILED",
      provisional: true
    });
  }
});

export default router;
