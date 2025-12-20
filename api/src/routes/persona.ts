import { Router, type IRouter, type Request, type Response } from "express";
import { getCurrentPersona, listPersonas } from "../persona/registry.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import type { PersonaCurrentResponseBody, PersonaListResponseBody } from "../types/persona.js";

const router: IRouter = Router();

router.get("/persona/list", (_req: Request, res: Response<PersonaListResponseBody>) => {
  return res.json({ personas: listPersonas() });
});

router.get("/persona/current", (_req: Request, res: Response<PersonaCurrentResponseBody>) => {
  return res.json({ persona: getCurrentPersona() });
});

// CORE-6: 人格状態の可変エンドポイント（変化後の状態を返す・慣性含む）
router.get("/persona", (_req: Request, res: Response) => {
  const state = getCurrentPersonaState();
  return res.json({
    personaId: state.personaId,
    ok: true,
    state: {
      mode: state.mode,
      phase: state.phase,
      inertia: state.inertia,
    },
  });
});

export default router;
