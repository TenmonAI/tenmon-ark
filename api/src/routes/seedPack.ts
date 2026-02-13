import { Router, type Request, type Response } from "express";

export const seedPackRouter = Router();

type PackReq = {
  seedIds?: string[];
  // 将来用: options
  options?: { level?: number; includeEdges?: boolean };
};

seedPackRouter.post("/seed/pack", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as PackReq;
  const seedIds = Array.isArray(body.seedIds) ? body.seedIds.filter((x) => typeof x === "string" && x.length > 0) : [];
  return res.json({
    ok: true,
    schemaVersion: 1,
    packId: `pack_${Date.now()}`,
    seedIds,
    // P2-0 は中身空で良い（契約のみ）
    payload: { kind: "SEED_PACK_STUB", items: [] as any[] },
  });
});

type UnpackReq = {
  packId?: string;
  payload?: any;
};

seedPackRouter.post("/seed/unpack", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as UnpackReq;
  return res.json({
    ok: true,
    schemaVersion: 1,
    packId: typeof body.packId === "string" ? body.packId : null,
    restored: { seedsCount: 0, edgesCount: 0 },
  });
});
