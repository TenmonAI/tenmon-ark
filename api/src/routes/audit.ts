// src/routes/audit.ts
// /api/audit: corpus存在/行数、kanagiPatterns状態、rankingPolicy値を返す

import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { getPatternsLoadStatus } from "../kanagi/patterns/loadPatterns.js";
import { RANKING_POLICY } from "../kotodama/rankingPolicy.js";
import { TENMON_ARK_VERSION, TENMON_ARK_BUILT_AT, TENMON_ARK_GIT_SHA } from "../version.js";

const router = Router();

const CORPUS_DIR = process.env.TENMON_CORPUS_DIR ?? "/opt/tenmon-corpus/db";

interface CorpusInfo {
  exists: boolean;
  lineCount: number | null;
}

interface CorpusAudit {
  khs: {
    text: CorpusInfo;
    lawCandidates: CorpusInfo;
  };
  ktk: {
    text: CorpusInfo;
    lawCandidates: CorpusInfo;
  };
  iroha: {
    text: CorpusInfo;
    lawCandidates: CorpusInfo;
  };
}

function countLines(filePath: string): number | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").filter(line => line.trim()).length;
  } catch {
    return null;
  }
}

function getCorpusInfo(fileName: string): CorpusInfo {
  const filePath = path.join(CORPUS_DIR, fileName);
  const exists = fs.existsSync(filePath);
  return {
    exists,
    lineCount: exists ? countLines(filePath) : null,
  };
}

router.get("/audit", (req, res) => {
  // 必ず 200 OK と application/json を返す
  res.setHeader("Content-Type", "application/json");
  
  try {
    // version/builtAt/gitSha（dist/version.js から）
    const version = TENMON_ARK_VERSION;
    // builtAt は null を許容しない（null の場合は現在時刻を使用）
    const builtAt = TENMON_ARK_BUILT_AT || new Date().toISOString();
    const gitSha = TENMON_ARK_GIT_SHA;

    // corpus存在/行数（khs/ktk/iroha の text.jsonl / law_candidates.jsonl）
    const corpus: CorpusAudit = {
      khs: {
        text: getCorpusInfo("khs_text.jsonl"),
        lawCandidates: getCorpusInfo("khs_law_candidates.jsonl"),
      },
      ktk: {
        text: getCorpusInfo("ktk_text.jsonl"),
        lawCandidates: getCorpusInfo("ktk_law_candidates.jsonl"),
      },
      iroha: {
        text: getCorpusInfo("iroha_text.jsonl"),
        lawCandidates: getCorpusInfo("iroha_law_candidates.jsonl"),
      },
    };

    // kanagiPatterns状態（loaded/count/sourcePath、取れなければ loaded:false,count:0）
    const kanagiPatternsStatus = getPatternsLoadStatus();
    const kanagiPatterns = kanagiPatternsStatus.loaded
      ? {
          loaded: true,
          count: kanagiPatternsStatus.count,
          sourcePath: kanagiPatternsStatus.path,
        }
      : {
          loaded: false,
          count: 0,
          sourcePath: null,
        };

    // rankingPolicy値（src/kotodama/rankingPolicy.ts の中身をそのまま返す）
    const rankingPolicy = RANKING_POLICY;

    // timestamp
    const timestamp = new Date().toISOString();

    res.status(200).json({
      version,
      builtAt,
      gitSha,
      corpus,
      kanagiPatterns,
      rankingPolicy,
      timestamp,
    });
  } catch (error: any) {
    // エラー時も 200 OK を返す（監査エンドポイントは常に成功を返す）
    // builtAt は null を許容しない（エラー時は現在時刻を使用）
    const fallbackBuiltAt = TENMON_ARK_BUILT_AT || new Date().toISOString();
    res.status(200).json({
      version: TENMON_ARK_VERSION || "unknown",
      builtAt: fallbackBuiltAt,
      gitSha: TENMON_ARK_GIT_SHA || null,
      corpus: {
        khs: { text: { exists: false, lineCount: null }, lawCandidates: { exists: false, lineCount: null } },
        ktk: { text: { exists: false, lineCount: null }, lawCandidates: { exists: false, lineCount: null } },
        iroha: { text: { exists: false, lineCount: null }, lawCandidates: { exists: false, lineCount: null } },
      },
      kanagiPatterns: {
        loaded: false,
        count: 0,
        sourcePath: null,
      },
      rankingPolicy: {},
      timestamp: new Date().toISOString(),
      error: error?.message || "Internal server error",
    });
  }
});

export default router;

