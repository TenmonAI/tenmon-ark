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
  try {
    // version/builtAt/gitSha
    const version = TENMON_ARK_VERSION;
    const builtAt = TENMON_ARK_BUILT_AT;
    const gitSha = TENMON_ARK_GIT_SHA;

    // corpus存在/行数
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

    // kanagiPatterns状態
    const kanagiPatterns = getPatternsLoadStatus();

    // rankingPolicy値
    const rankingPolicy = {
      IROHA_BOOST: RANKING_POLICY.IROHA_BOOST,
      KTK_BOOST: RANKING_POLICY.KTK_BOOST,
      KHS_DEFINITION_ZONE_BONUS: {
        PRIMARY: RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS.PRIMARY,
        SECONDARY: RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS.SECONDARY,
      },
      LAW_CANDIDATES: RANKING_POLICY.LAW_CANDIDATES,
      DOC_WEIGHTS: RANKING_POLICY.DOC_WEIGHTS,
    };

    // verifier（未実装）
    const verifier = {
      mode: "todo",
    };

    res.json({
      version,
      builtAt,
      gitSha,
      corpus,
      kanagiPatterns: kanagiPatterns.loaded
        ? {
            loaded: true,
            count: kanagiPatterns.count,
            sourcePath: kanagiPatterns.path,
          }
        : {
            loaded: false,
            count: 0,
            sourcePath: null,
          },
      rankingPolicy,
      verifier,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

