import { Router } from "express";
export const meRouter = Router();

meRouter.get("/me", (_req, res) => {
  return res.status(200).json({
    ok: true,
    user: null,
    founder: false,
    note: "stub me endpoint (will be wired to auth later)",
  });
});
