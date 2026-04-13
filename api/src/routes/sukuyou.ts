/**
 * 宿曜経 × 天津金木 × 言霊 統合診断 APIルート
 * 
 * エンドポイント:
 * - POST /api/sukuyou/diagnose     — 完全統合診断
 * - POST /api/sukuyou/compatibility — 統合相性診断
 * - GET  /api/sukuyou/daily         — 今日の運勢
 * - GET  /api/sukuyou/nakshatras    — 二十七宿一覧
 */

import { Router, type Request, type Response } from "express";
import {
  runCompleteDiagnosis,
  integratedCompatibility,
  analyzeNameKotodama,
  calculateThreeLayerPhase,
  calculateDailyNakshatra,
  calculateDailyPlanet,
  calculateJuniChoku,
  calculateYunenHakke,
  NAKSHATRAS,
  NAKSHATRA_DATA,
  PLANET_DATA,
  solarToLunar,
  calculateHonmeiShuku,
  type Nakshatra
} from "../sukuyou/index.js";
import { generateTenmonArkReport } from "../sukuyou/reportGenerator.js";

const router = Router();

// ============================================
// POST /api/sukuyou/diagnose — 完全統合診断
// ============================================
router.post("/diagnose", async (req: Request, res: Response) => {
  try {
    const { birthDate, name } = req.body;

    if (!birthDate) {
      return res.status(400).json({
        error: "birthDate は必須です（YYYY-MM-DD形式）"
      });
    }

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return res.status(400).json({
        error: "birthDate の形式が不正です。YYYY-MM-DD形式で指定してください。"
      });
    }

    // カタカナ名（オプション）
    const katakanaName = name ? String(name) : undefined;

    // 完全統合診断の実行
    const result = runCompleteDiagnosis(birth, katakanaName);

    return res.json({
      success: true,
      diagnosis: {
        // 基本情報
        lunarDate: result.sukuyou.lunarDate,
        honmeiShuku: result.sukuyou.honmeiShuku,
        shukuData: result.sukuyou.shukuData,
        honmeiYo: result.sukuyou.honmeiYo,
        planetData: result.sukuyou.planetData,
        kyusei: result.sukuyou.kyusei,
        meikyu: result.sukuyou.meikyu,
        palaceConfig: result.sukuyou.palaceConfig,

        // 名前の言霊解析
        nameAnalysis: result.nameAnalysis,

        // 天津金木三層位相
        threeLayer: {
          civilization: result.threeLayer.civilization.description,
          year: result.threeLayer.year.description,
          day: result.threeLayer.day.description
        },

        // 躰/用判定
        taiYou: {
          judgment: result.taiYou.taiYou,
          fireScore: Math.round(result.taiYou.totalFireScore),
          waterScore: Math.round(result.taiYou.totalWaterScore),
          interpretation: result.taiYou.interpretation
        },

        // 今日の運勢
        daily: {
          nakshatra: result.sukuyou.dailyNakshatra,
          relation: result.sukuyou.dailyRelation,
          planet: result.sukuyou.dailyPlanet,
          juniChoku: result.sukuyou.juniChoku,
          yunenHakke: result.sukuyou.yunenHakke
        },

        // 完全テキスト
        fullInterpretation: result.fullInterpretation
      }
    });
  } catch (err: any) {
    console.error("[sukuyou/diagnose] Error:", err);
    return res.status(500).json({ error: err.message || "診断中にエラーが発生しました" });
  }
});

// ============================================
// POST /api/sukuyou/compatibility — 統合相性診断
// ============================================
router.post("/compatibility", async (req: Request, res: Response) => {
  try {
    const { personA, personB } = req.body;

    if (!personA?.birthDate || !personB?.birthDate) {
      return res.status(400).json({
        error: "personA.birthDate と personB.birthDate は必須です"
      });
    }

    const birthA = new Date(personA.birthDate);
    const birthB = new Date(personB.birthDate);

    if (isNaN(birthA.getTime()) || isNaN(birthB.getTime())) {
      return res.status(400).json({
        error: "birthDate の形式が不正です。YYYY-MM-DD形式で指定してください。"
      });
    }

    // 各人の命宿と名前解析（Date型を渡してルックアップテーブルを優先使用）
    const shukuA = calculateHonmeiShuku(birthA);
    const shukuB = calculateHonmeiShuku(birthB);

    const nameA = personA.name ? analyzeNameKotodama(String(personA.name)) : null;
    const nameB = personB.name ? analyzeNameKotodama(String(personB.name)) : null;

    // 統合相性診断
    const result = integratedCompatibility(
      { honmeiShuku: shukuA, nameBalance: nameA ? nameA.balance : 0 },
      { honmeiShuku: shukuB, nameBalance: nameB ? nameB.balance : 0 }
    );

    return res.json({
      success: true,
      compatibility: {
        personA: {
          honmeiShuku: shukuA,
          shukuData: NAKSHATRA_DATA[shukuA],
          nameAnalysis: nameA
        },
        personB: {
          honmeiShuku: shukuB,
          shukuData: NAKSHATRA_DATA[shukuB],
          nameAnalysis: nameB
        },
        sanku: {
          relAtoB: result.sankuResult.relAtoB,
          relBtoA: result.sankuResult.relBtoA,
          fortuneAtoB: result.sankuResult.fortuneAtoB,
          fortuneBtoA: result.sankuResult.fortuneBtoA,
          mutual: result.sankuResult.mutual,
          description: result.sankuResult.description
        },
        waterFire: result.waterFireCompatibility,
        totalScore: result.totalScore,
        totalGrade: result.totalGrade,
        interpretation: result.interpretation
      }
    });
  } catch (err: any) {
    console.error("[sukuyou/compatibility] Error:", err);
    return res.status(500).json({ error: err.message || "相性診断中にエラーが発生しました" });
  }
});

// ============================================
// GET /api/sukuyou/daily — 今日の運勢
// ============================================
router.get("/daily", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const lunarToday = solarToLunar(today);
    const dailyNakshatra = calculateDailyNakshatra(today);
    const dailyPlanet = calculateDailyPlanet(today);
    const juniChoku = calculateJuniChoku(lunarToday.month, lunarToday.day);
    const yunenHakke = calculateYunenHakke(today.getUTCFullYear());
    const threeLayer = calculateThreeLayerPhase(today);

    const shukuData = NAKSHATRA_DATA[dailyNakshatra];
    const planetData = PLANET_DATA[dailyPlanet];

    return res.json({
      success: true,
      daily: {
        date: today.toISOString().split("T")[0],
        lunarDate: lunarToday,
        nakshatra: dailyNakshatra,
        shukuData,
        planet: dailyPlanet,
        planetData,
        juniChoku,
        yunenHakke,
        threeLayer: {
          civilization: threeLayer.civilization.description,
          year: threeLayer.year.description,
          day: threeLayer.day.description
        },
        auspicious: shukuData.auspicious,
        inauspicious: shukuData.inauspicious
      }
    });
  } catch (err: any) {
    console.error("[sukuyou/daily] Error:", err);
    return res.status(500).json({ error: err.message || "日運算出中にエラーが発生しました" });
  }
});

// ============================================
// GET /api/sukuyou/nakshatras — 二十七宿一覧
// ============================================
router.get("/nakshatras", async (_req: Request, res: Response) => {
  try {
    const list = NAKSHATRAS.map((n: Nakshatra, i: number) => ({
      number: i + 1,
      ...NAKSHATRA_DATA[n]
    }));
    return res.json({ success: true, nakshatras: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================
// POST /api/sukuyou/report — 天聞アーク統合鑑定レポート
// ============================================
router.post("/report", async (req: Request, res: Response) => {
  try {
    const { birthDate, name, birthTime, birthPlace } = req.body;

    if (!birthDate) {
      return res.status(400).json({
        error: "birthDate は必須です（YYYY-MM-DD形式）"
      });
    }

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return res.status(400).json({
        error: "birthDate の形式が不正です。YYYY-MM-DD形式で指定してください。"
      });
    }

    const katakanaName = name ? String(name) : undefined;
    const confidence = req.body.confidence || "B";
    const mode = req.body.mode || "BOOKCAL";
    const consultationTheme = req.body.consultationTheme || undefined;

    const report = generateTenmonArkReport(birth, katakanaName, {
      confidence,
      mode,
      consultationTheme,
    });

    return res.json({
      success: true,
      report: {
        version: report.version,
        generatedAt: report.generatedAt,
        sections: report.sections,
        fullText: report.fullText,
        structuredData: report.structuredData
      }
    });
  } catch (err: any) {
    console.error("[sukuyou/report] Error:", err);
    return res.status(500).json({ error: err.message || "レポート生成中にエラーが発生しました" });
  }
});

export default router;

