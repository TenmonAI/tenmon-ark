/**
 * CARD-MC-19: GET /api/mc/vnext/intelligence と /intelligence/fire
 */
import { Router, type Request, type Response } from "express";
import { sanitize } from "../../core/mc/sanitizer.js";
import {
  buildDeepIntelligencePayloadV1,
  buildIntelligenceFireOnlyPayloadV1,
} from "../intelligence/deepIntelligenceMapV1.js";

export const mcIntelligenceObsRouter = Router();

mcIntelligenceObsRouter.get("/", (_req: Request, res: Response) => {
  res.json(sanitize(buildDeepIntelligencePayloadV1()));
});

mcIntelligenceObsRouter.get("/fire", (_req: Request, res: Response) => {
  res.json(sanitize(buildIntelligenceFireOnlyPayloadV1()));
});
