import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import { promises as fs } from "node:fs";

import { UPLOAD_DIR, RESEARCH_DIR, RULES_DIR } from "../research/paths.js";
import { addFile, listFiles, sha256File, updateFile, uploadPath, type StoredFile } from "../research/store.js";
import { extractToText } from "../research/extract.js";
import { analyzeText } from "../research/analyze.js";
import { analyzeDeep } from "../research/analyze_deep.js";
import { buildPages } from "../research/pages.js";

const router = Router();

// --- 文字化け回避ヘルパー ---
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
    if (decoded !== name && decoded.includes("\uFFFD") === false) return decoded;
  } catch {
    // noop
  }

  return name;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

// --- multer設定 ---
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

// --- 研究APIの正式ルート（6つのエンドポイントのみ）---

// POST /api/research/upload
router.post("/upload", upload.array("files", 50), async (req: Request, res: Response) => {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) return res.status(400).json({ ok: false, error: "no files" });

  const saved: StoredFile[] = [];
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

  // --- 自動学習（R3）: アップロード後に裏で pages build + extract + analyze を走らせる ---
  // 失敗しても upload 自体は成功扱い（研究運用を止めない）
  setImmediate(async () => {
    for (const meta of saved) {
      try {
        const fp = uploadPath(meta.storedName);
        const isPDF = (meta.originalName || "").toLowerCase().endsWith(".pdf");

        // PDFなら build-pages を先に生成（ページ画像 + ページtxt）
        if (isPDF) {
          await buildPages({ id: meta.id, pdfPath: fp, dpi: 200 });
        }

        // 次に extract（auto）→ analyze → analyze-deep
        try {
          const { preview, used } = await extractToText({
            id: meta.id,
            filePath: fp,
            originalName: meta.originalName,
            mode: "auto",
          });
          await updateFile(meta.id, { extractedAt: new Date().toISOString() });

          // analyze（通常）
          try {
            const textPath = path.join(process.cwd(), "data", "research", "text", `${meta.id}.txt`);
            await analyzeText({ id: meta.id, textPath });
            await updateFile(meta.id, { analyzedAt: new Date().toISOString() });
          } catch (e) {
            console.error("[research:auto:analyze]", meta.id, e);
          }

          // analyze-deep（深層）
          try {
            const textPath = path.join(process.cwd(), "data", "research", "text", `${meta.id}.txt`);
            await analyzeDeep({ id: meta.id, textPath });
          } catch (e) {
            console.error("[research:auto:analyze-deep]", meta.id, e);
          }
        } catch (e) {
          console.error("[research:auto:extract]", meta.id, e);
        }
      } catch (e) {
        console.error("[research:auto]", meta.id, e);
      }
    }
  });

  return res.json({ ok: true, files: saved });
});

// POST /api/research/extract
router.post("/extract", async (req: Request, res: Response) => {
  const id = String((req.body as any)?.id ?? "");
  if (!id) return res.status(400).json({ ok: false, error: "id is required" });

  const files = await listFiles();
  const f = files.find((x) => x.id === id);
  if (!f) return res.status(404).json({ ok: false, error: "not found" });

  const filePath = uploadPath(f.storedName);

  try {
    const mode = String((req.body as any)?.mode ?? "auto");
    const { preview, used } = await extractToText({
      id,
      filePath,
      originalName: f.originalName,
      mode: mode === "ocr" ? "ocr" : mode === "text" ? "text" : "auto",
    });
    await updateFile(id, { extractedAt: new Date().toISOString() });
    return res.json({ ok: true, id, preview, used });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/research/analyze
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
    return res.json({ ok: true, id, ruleset });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/research/analyze-deep
router.post("/analyze-deep", async (req: Request, res: Response) => {
  const id = String((req.body as any)?.id ?? "");
  if (!id) return res.status(400).json({ ok: false, error: "id is required" });

  const textPath = path.join(process.cwd(), "data", "research", "text", `${id}.txt`);
  try {
    await fs.access(textPath);
  } catch {
    return res.status(400).json({ ok: false, error: "text not extracted yet. call /extract first" });
  }

  try {
    const { ruleset } = await analyzeDeep({ id, textPath });
    await updateFile(id, { analyzedAt: new Date().toISOString() });
    return res.json({ ok: true, id, ruleset });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/research/build-pages
router.post("/build-pages", async (req: Request, res: Response) => {
  const id = String((req.body as any)?.id ?? "");
  if (!id) return res.status(400).json({ ok: false, error: "id is required" });

  const files = await listFiles();
  const f = files.find((x) => x.id === id);
  if (!f) return res.status(404).json({ ok: false, error: "not found" });

  const filePath = uploadPath(f.storedName);

  try {
    const manifest = await buildPages({ id, pdfPath: filePath, dpi: 200 });
    await updateFile(id, { extractedAt: new Date().toISOString() });
    return res.json({ ok: true, id, manifest });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

// POST /api/research/approve-rules
router.post("/approve-rules", async (req: Request, res: Response) => {
  const id = String((req.body as any)?.id ?? "");
  const ruleIds = Array.isArray((req.body as any)?.ruleIds) ? (req.body as any).ruleIds : [];
  if (!id || ruleIds.length === 0) {
    return res.status(400).json({ ok: false, error: "id and ruleIds are required" });
  }

  try {
    await ensureDir(RULES_DIR);

    // 深層解析結果を読み込む
    const deepPath = path.join(RULES_DIR, `${id}.deep.json`);
    let deepRuleset: any = null;
    try {
      const raw = await fs.readFile(deepPath, "utf-8");
      deepRuleset = JSON.parse(raw);
    } catch {
      // 深層解析結果がない場合は通常解析結果を試す
      const normalPath = path.join(RULES_DIR, `${id}.json`);
      try {
        const raw = await fs.readFile(normalPath, "utf-8");
        deepRuleset = JSON.parse(raw);
      } catch {
        return res.status(404).json({ ok: false, error: "ruleset not found. call /analyze or /analyze-deep first" });
      }
    }

    // 採用されたルールのみを抽出
    const approvedRules = (deepRuleset.rules || []).filter((r: any, idx: number) => {
      // ruleIds がインデックスの場合
      if (ruleIds.includes(idx)) return true;
      // ruleIds がルールID（title/rule）の場合
      if (ruleIds.includes(r.title) || ruleIds.includes(r.rule)) return true;
      return false;
    });

    if (approvedRules.length === 0) {
      return res.status(400).json({ ok: false, error: "no rules approved" });
    }

    // fixed.json に保存（追記形式）
    const fixedPath = path.join(RULES_DIR, "fixed.json");
    let fixedRules: any[] = [];
    try {
      const existing = await fs.readFile(fixedPath, "utf-8");
      const parsed = JSON.parse(existing);
      fixedRules = Array.isArray(parsed.rules) ? parsed.rules : [];
    } catch {
      // ファイルが存在しない場合は新規作成
    }

    // 重複チェック（同じ rule が既に存在する場合はスキップ）
    const existingRules = new Set(fixedRules.map((r: any) => r.rule));
    const newRules = approvedRules.filter((r: any) => !existingRules.has(r.rule));

    if (newRules.length === 0) {
      return res.json({ ok: true, message: "all rules already approved", approved: 0, skipped: approvedRules.length });
    }

    fixedRules.push(...newRules.map((r: any) => ({ ...r, sourceId: id, approvedAt: new Date().toISOString() })));

    const fixedContent = {
      version: "R3",
      updatedAt: new Date().toISOString(),
      rules: fixedRules,
    };

    await fs.writeFile(fixedPath, JSON.stringify(fixedContent, null, 2), "utf-8");

    return res.json({
      ok: true,
      id,
      approved: newRules.length,
      skipped: approvedRules.length - newRules.length,
      total: fixedRules.length,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

export default router;
