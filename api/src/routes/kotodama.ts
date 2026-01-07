import { Router, type IRouter, type Request, type Response } from "express";
import { listPages, listLawsByDocAndPage } from "../kotodama/db.js";
import { getCorpusPage, getCorpusPages } from "../kotodama/corpusLoader.js";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

/**
 * GET /api/kotodama/pages?doc=言霊秘書.pdf&pdfPage=1
 * または
 * GET /api/kotodama/pages?doc=言霊秘書.pdf&from=1&to=20
 * 
 * 1ページ単位の原文を取得（閲覧専用）
 * pdfPage が指定されれば単一ページ、from/to が指定されれば範囲
 */
router.get("/pages", (req: Request, res: Response) => {
  try {
    const doc = (req.query.doc as string) || "言霊秘書.pdf";
    const pdfPage = req.query.pdfPage ? Number(req.query.pdfPage) : undefined;
    const from = req.query.from ? Number(req.query.from) : undefined;
    const to = req.query.to ? Number(req.query.to) : undefined;

    // pdfPage 単体指定の場合
    if (pdfPage !== undefined) {
      if (!Number.isFinite(pdfPage) || pdfPage <= 0) {
        return res.status(400).json({
          error: "INVALID_PAGE",
          message: "pdfPage は 1 以上の整数である必要があります",
        });
      }

      // まず corpusLoader から取得を試みる
      const corpusPage = getCorpusPage(doc, pdfPage);
      if (corpusPage) {
        return res.json({ doc, pdfPage, page: corpusPage });
      }

      // corpus にない場合は既存の DB から取得
      const pages = listPages(doc, pdfPage, pdfPage);
      if (pages.length > 0) {
        return res.json({ doc, pdfPage, page: pages[0] });
      }

      return res.status(404).json({
        error: "PAGE_NOT_FOUND",
        message: `ページ ${pdfPage} が見つかりません`,
      });
    }

    // from/to 範囲指定の場合
    if (from !== undefined && to !== undefined) {
      if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < from) {
        return res.status(400).json({
          error: "INVALID_RANGE",
          message: "from, to は 1 以上の整数で、from <= to である必要があります",
        });
      }

      // まず corpusLoader から取得を試みる
      const corpusPages = getCorpusPages(doc, from, to);
      if (corpusPages.length > 0) {
        return res.json({ doc, from, to, pages: corpusPages });
      }

      // corpus にない場合は既存の DB から取得
      const pages = listPages(doc, from, to);
      return res.json({ doc, from, to, pages });
    }

    return res.status(400).json({
      error: "PARAMETER_REQUIRED",
      message: "pdfPage または from/to のいずれかを指定してください",
    });
  } catch (err: any) {
    console.error("[KOTODAMA-PAGES-ERROR]", err);
    res.status(500).json({
      error: "PAGES_FAILED",
      message: err.message || "ページ一覧の取得に失敗しました",
    });
  }
});

/**
 * GET /api/kotodama/laws?doc=言霊秘書.pdf&pdfPage=35
 * 指定ページの Law を取得（閲覧専用）
 */
router.get("/laws", (req: Request, res: Response) => {
  try {
    const doc = (req.query.doc as string) || "言霊秘書.pdf";
    const pdfPage = req.query.pdfPage ? Number(req.query.pdfPage) : undefined;

    if (!pdfPage || !Number.isFinite(pdfPage) || pdfPage <= 0) {
      return res.status(400).json({
        error: "PDF_PAGE_REQUIRED",
        message: "pdfPage クエリパラメータが必要です（1以上の整数）",
      });
    }

    const laws = listLawsByDocAndPage(doc, pdfPage);
    res.json({ doc, pdfPage, laws });
  } catch (err: any) {
    console.error("[KOTODAMA-LAWS-ERROR]", err);
    res.status(500).json({
      error: "LAWS_FAILED",
      message: err.message || "Law の取得に失敗しました",
    });
  }
});

/**
 * GET /api/kotodama/page-image?doc=言霊秘書.pdf&pdfPage=1
 * ページ画像を取得（Content-Type: image/png）
 */
router.get("/page-image", (req: Request, res: Response) => {
  try {
    const doc = (req.query.doc as string) || "言霊秘書.pdf";
    const pdfPage = req.query.pdfPage ? Number(req.query.pdfPage) : undefined;

    if (!pdfPage || !Number.isFinite(pdfPage) || pdfPage <= 0) {
      return res.status(400).json({
        error: "PDF_PAGE_REQUIRED",
        message: "pdfPage クエリパラメータが必要です（1以上の整数）",
      });
    }

    // corpusLoader から imagePath を取得
    const corpusPage = getCorpusPage(doc, pdfPage);
    if (!corpusPage || !corpusPage.imagePath) {
      return res.status(404).json({
        error: "IMAGE_NOT_FOUND",
        message: `ページ ${pdfPage} の画像が見つかりません`,
      });
    }

    const imagePath = path.resolve(corpusPage.imagePath);
    
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
        console.error("[KOTODAMA-PAGE-IMAGE-ERROR]", err);
        if (!res.headersSent) {
          res.status(500).json({
            error: "IMAGE_SEND_FAILED",
            message: err.message || "画像の送信に失敗しました",
          });
        }
      }
    });
  } catch (err: any) {
    console.error("[KOTODAMA-PAGE-IMAGE-ERROR]", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "IMAGE_FAILED",
        message: err.message || "画像の取得に失敗しました",
      });
    }
  }
});

export default router;


