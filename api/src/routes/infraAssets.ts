import { Router } from "express";
import { getInfraAsset, getInfraAssets, getInfraAssetsReport } from "../infra/assetReport.js";

export const infraAssetsRouter = Router();

infraAssetsRouter.get("/assets/report", (_req, res) => {
  return res.json(getInfraAssetsReport());
});

infraAssetsRouter.get("/assets", (_req, res) => {
  return res.json(getInfraAssets());
});

infraAssetsRouter.get("/assets/:assetKey", (req, res) => {
  const assetKey = String(req.params.assetKey || "");
  const row = getInfraAsset(assetKey);
  if (!row) {
    return res.status(404).json({ ok: false, error: "asset_not_found", assetKey });
  }
  return res.json({ ok: true, asset: row });
});
