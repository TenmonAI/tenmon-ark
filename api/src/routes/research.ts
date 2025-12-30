import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import { promises as fs } from "node:fs";

import { UPLOAD_DIR } from "../research/paths.js";
import { addFile, listFiles, sha256File, updateFile, uploadPath } from "../research/store.js";
import { extractToText } from "../research/extract.js";
import { analyzeText } from "../research/analyze.js";

const router = Router();

function fixOriginalName(name: string): string {
  // 既に日本語/漢字が含まれていたら、そのまま
  const hasJP = /[\u3040-\u30ff\u3400-\u9fff]/.test(name);
  if (hasJP) return name;

  // multer/busboy が latin1 扱いして文字化けするケースを救済
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    const decodedHasJP = /[\u3040-\u30ff\u3400-\u9fff]/.test(decoded);
    // 変換後に日本語が出てきたら採用
    if (decodedHasJP) return decoded;

    // 日本語は無いけど、変換で明らかに読みやすくなってる場合も採用（保険）
    if (decoded !== name && decoded.includes("") === false) return decoded;
  } catch {
    // noop
  }

  return name;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureDir(UPLOAD_DIR);
      cb(null, UPLOAD_DIR);
    } catch (e: any) {
      cb(e, UPLOAD_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const original = fixOriginalName(file.originalname);
    const safe = original.replace(/[^\w.\-()ぁ-んァ-ヶ一-龠]/g, "_");
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}__${safe}`);
  },
});

// ✅ nginx(2g) と揃える
const TWO_GB = 2 * 1024 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { files: 50, fileSize: TWO_GB },
});

router.post("/upload", upload.array("files", 50), async (req: Request, res: Response) => {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) return res.status(400).json({ ok: false, error: "no files" });

  const saved = [];
  for (const f of files) {
    const p = uploadPath(path.basename(f.filename));
    const sha = await sha256File(p);

    const meta = await addFile({
      originalName: fixOriginalName(f.originalname),
      storedName: path.basename(f.filename),
      mime: f.mimetype,
      size: f.size,
      sha256: sha,
      uploadedAt: new Date().toISOString(),
    });

    saved.push(meta);
  }

  return res.json({ ok: true, files: saved });
});

router.get("/files", async (_req: Request, res: Response) => {
  const files = await listFiles();
  return res.json({ ok: true, files });
});

router.post("/extract", async (req: Request, res: Response) => {
  const id = String((req.body as any)?.id ?? "");
  if (!id) return res.status(400).json({ ok: false, error: "id is required" });

  const files = await listFiles();
  const f = files.find((x) => x.id === id);
  if (!f) return res.status(404).json({ ok: false, error: "not found" });

  const filePath = uploadPath(f.storedName);

  try {
    const { preview, used } = await extractToText({ id, filePath, originalName: f.originalName });
    await updateFile(id, { extractedAt: new Date().toISOString() });
    return res.json({ ok: true, id, preview, used });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

router.post("/analyze", async (req: Request, res: Response) => {
  const id = String((req.body as any)?.id ?? "");
  if (!id) return res.status(400).json({ ok: false, error: "id is required" });

  const textPath = path.join(process.cwd(), "data", "research", "text", `${id}.txt`);
  try {
    await fs.access(textPath);
  } catch {
    return res.status(400).json({ ok: false, error: "text not extracted yet. call /extract first" });
  }

  try {
    const { ruleset } = await analyzeText({ id, textPath });
    await updateFile(id, { analyzedAt: new Date().toISOString() });

    // 「本文に無いことは無い」：0件なら blockedReason を返す
    return res.json({ ok: true, id, ruleset });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

router.get("/rules/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  const p = path.join(process.cwd(), "data", "research", "rules", `${id}.json`);
  try {
    const raw = await fs.readFile(p, "utf-8");
    return res.json({ ok: true, ruleset: JSON.parse(raw) });
  } catch {
    return res.status(404).json({ ok: false, error: "rules not found" });
  }
});

export default router;

