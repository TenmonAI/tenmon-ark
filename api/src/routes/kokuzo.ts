// KOKŪZŌ v1.1: API Routes

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { saveFile, listFiles } from "../kokuzo/storage.js";
import { indexFile } from "../kokuzo/indexer.js";
import { searchChunks, getSeedsByFile } from "../kokuzo/search.js";

const router: IRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * POST /api/kokuzo/upload
 * Accept file upload and save to storage
 */
router.post("/kokuzo/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const file = saveFile(req.file.originalname, req.file.buffer);
    return res.json({
      success: true,
      file: {
        id: file.id,
        filename: file.filename,
        uploaded_at: file.uploaded_at,
      },
    });
  } catch (error) {
    console.error("[KOKUZO UPLOAD ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
});

/**
 * POST /api/kokuzo/index
 * Index a file: split into chunks, generate summaries, assign axes
 */
router.post("/kokuzo/index", async (req: Request, res: Response) => {
  const { file_id } = req.body as { file_id?: number };

  if (typeof file_id !== "number") {
    return res.status(400).json({ error: "file_id is required" });
  }

  try {
    const result = indexFile(file_id);
    return res.json({
      success: true,
      chunks: result.chunks.length,
      seed: result.seed,
    });
  } catch (error) {
    console.error("[KOKUZO INDEX ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Indexing failed",
    });
  }
});

/**
 * GET /api/kokuzo/search?q=query
 * Search chunks by content or summary
 */
router.get("/kokuzo/search", (req: Request, res: Response) => {
  const query = req.query.q as string | undefined;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const chunks = searchChunks(query);
    const fileIds = [...new Set(chunks.map((c: any) => c.file_id))];
    const seeds = fileIds.flatMap((fileId) => getSeedsByFile(fileId));

    return res.json({
      success: true,
      query,
      chunks,
      seeds,
    });
  } catch (error) {
    console.error("[KOKUZO SEARCH ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
});

/**
 * GET /api/kokuzo/files
 * List all uploaded files
 */
router.get("/kokuzo/files", (_req: Request, res: Response) => {
  try {
    const files = listFiles();
    return res.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("[KOKUZO FILES ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list files",
    });
  }
});

/**
 * GET /api/kokuzo/seeds?file_id=123
 * Get seeds for a specific file
 */
router.get("/kokuzo/seeds", (req: Request, res: Response) => {
  const fileId = req.query.file_id ? Number(req.query.file_id) : undefined;

  if (typeof fileId !== "number") {
    return res.status(400).json({ error: "file_id query parameter is required" });
  }

  try {
    const seeds = getSeedsByFile(fileId);
    return res.json({
      success: true,
      seeds,
    });
  } catch (error) {
    console.error("[KOKUZO SEEDS ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get seeds",
    });
  }
});

export default router;

