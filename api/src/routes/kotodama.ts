import { Router, type IRouter, type Request, type Response } from "express";
import { listPages, listLawsByDocAndPage } from "../kotodama/db.js";

const router: IRouter = Router();

/**
 * GET /api/kotodama/pages?doc=言霊秘書.pdf&from=1&to=20
 * 1ページ単位の原文を取得（閲覧専用）
 */
router.get("/pages", (req: Request, res: Response) => {
  try {
    const doc = (req.query.doc as string) || "言霊秘書.pdf";
    const from = req.query.from ? Number(req.query.from) : 1;
    const to = req.query.to ? Number(req.query.to) : from;

    if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < from) {
      return res.status(400).json({
        error: "INVALID_RANGE",
        message: "from, to は 1 以上の整数で、from <= to である必要があります",
      });
    }

    const pages = listPages(doc, from, to);
    res.json({ doc, from, to, pages });
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

export default router;


