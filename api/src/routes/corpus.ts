/**
 * Corpus API（Read-only）
 * 
 * 三資料（言霊秘書/カタカムナ/いろは）の manifest と画像を提供
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getCorpusPage, getAvailableDocs } from "../kotodama/corpusLoader.js";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

/**
 * GET /api/corpus/docs
 * 利用可能なドキュメント一覧を返す
 */
router.get("/docs", (req: Request, res: Response) => {
  try {
    const docs = getAvailableDocs();
    res.json({ docs });
  } catch (err: any) {
    console.error("[CORPUS-DOCS-ERROR]", err);
    res.status(500).json({
      error: "DOCS_FAILED",
      message: err.message || "ドキュメント一覧の取得に失敗しました",
    });
  }
});

/**
 * GET /api/corpus/page?doc=言霊秘書.pdf&pdfPage=1
 * manifest レコードを返す
 */
router.get("/page", (req: Request, res: Response) => {
  try {
    const rawDoc = String(req.query.doc ?? "");
    const pdfPage = req.query.pdfPage ? Number(req.query.pdfPage) : undefined;

    if (!rawDoc) {
      return res.status(400).json({
        error: "DOC_REQUIRED",
        message: "doc クエリパラメータが必要です",
      });
    }

    // doc を decodeURIComponent した値で getCorpusPage に渡す
    const doc = decodeURIComponent(rawDoc);

    if (!pdfPage || !Number.isFinite(pdfPage) || pdfPage <= 0) {
      return res.status(400).json({
        error: "PDF_PAGE_REQUIRED",
        message: "pdfPage クエリパラメータが必要です（1以上の整数）",
      });
    }

    const page = getCorpusPage(doc, pdfPage);
    if (!page) {
      return res.status(404).json({
        error: "PAGE_NOT_FOUND",
        message: `ページ ${pdfPage} が見つかりません`,
      });
    }

    res.json({ doc, pdfPage, page });
  } catch (err: any) {
    console.error("[CORPUS-PAGE-ERROR]", err);
    res.status(500).json({
      error: "PAGE_FAILED",
      message: err.message || "ページの取得に失敗しました",
    });
  }
});

/**
 * GET /api/corpus/page-image?doc=言霊秘書.pdf&pdfPage=1
 * PNG 画像を返す（Content-Type: image/png）
 */
router.get("/page-image", (req: Request, res: Response) => {
  try {
    const rawDoc = String(req.query.doc ?? "");
    const pdfPage = req.query.pdfPage ? Number(req.query.pdfPage) : undefined;

    if (!rawDoc) {
      return res.status(400).json({
        error: "DOC_REQUIRED",
        message: "doc クエリパラメータが必要です",
      });
    }

    // doc を decodeURIComponent した値で getCorpusPage に渡す
    const doc = decodeURIComponent(rawDoc);

    if (!pdfPage || !Number.isFinite(pdfPage) || pdfPage <= 0) {
      return res.status(400).json({
        error: "PDF_PAGE_REQUIRED",
        message: "pdfPage クエリパラメータが必要です（1以上の整数）",
      });
    }

    const page = getCorpusPage(doc, pdfPage);
    if (!page || !page.imagePath) {
      return res.status(404).json({
        error: "IMAGE_NOT_FOUND",
        message: `ページ ${pdfPage} の画像が見つかりません`,
      });
    }

    const imagePath = path.resolve(page.imagePath);
    
    // ファイルの存在確認
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        error: "IMAGE_FILE_NOT_FOUND",
        message: `画像ファイルが見つかりません: ${imagePath}`,
      });
    }

    // Content-Type を設定してファイルを送信
    res.setHeader("Content-Type", "image/png");
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error("[CORPUS-PAGE-IMAGE-ERROR]", err);
        if (!res.headersSent) {
          res.status(500).json({
            error: "IMAGE_SEND_FAILED",
            message: err.message || "画像の送信に失敗しました",
          });
        }
      }
    });
  } catch (err: any) {
    console.error("[CORPUS-PAGE-IMAGE-ERROR]", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "IMAGE_FAILED",
        message: err.message || "画像の取得に失敗しました",
      });
    }
  }
});

export default router;

