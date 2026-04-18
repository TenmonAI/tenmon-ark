/**
 * ACCEPT_SYNAPSES_V1 — kokuzo_synapses ACCEPTED 化スクリプト
 * ===========================================================
 *
 * 886 件全て PROPOSED のシナプスを適正に ACCEPTED/REJECTED に振り分ける。
 * 現状: 全て KHS_KERNEL:SUIKA_CYCLE 自己参照 → 多様な Law 間接続を構築。
 *
 * 処理ステップ:
 *   1. khs_laws から真の fromLawId を生成（SUIKA_CYCLE 以外にも接続）
 *   2. score 0.7+ は AUTO_ACCEPT
 *   3. score 0.4-0.7 は evidenceQuote の品質で判定
 *   4. score < 0.4 は REJECTED
 *   5. evolution_ledger_v1 への封印
 *
 * 安全設計:
 *   - --dry-run で書き込みなし確認可能
 *   - バックアップテーブル kokuzo_synapses_backup_v1 を自動作成
 *   - 全操作をトランザクション内で実行
 *
 * 使用法:
 *   npx tsx api/src/scripts/accept_synapses_v1.ts [--dry-run] [--db-path /path/to/kokuzo.sqlite]
 *
 * 成功基準:
 *   ✅ kokuzo_synapses ACCEPTED: 200+ 件
 *   ✅ 多様な fromLawId (100+ 種類)
 *   ✅ SUIKA_CYCLE 以外の Law にも接続
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";

// ── 設定 ─────────────────────────────────────────────
const DEFAULT_DB_PATH =
  process.env.KOKUZO_DB_PATH || "/opt/tenmon-ark-data/kokuzo.sqlite";

// ── truth_axis キーワード（fromLawId 再マッピング用） ─
const AXIS_KEYWORDS: Record<string, string[]> = {
  cycle: ["循環", "巡り", "回帰", "周期", "めぐり", "サイクル", "輪廻"],
  polarity: ["水火", "イキ", "陰陽", "対極", "二元", "水", "火", "昇降"],
  center: ["正中", "まなか", "中心", "ゝ", "凝", "ア", "基底", "母体"],
  breath: ["息", "呼吸", "吐納", "気息", "吸", "吐", "氣", "生命力"],
  carami: ["カラミ", "絡み", "交合", "結合", "與合", "交差", "螺旋"],
  order: ["秩序", "配列", "順序", "五十連", "行列", "位", "階層"],
  correspondence: ["対応", "照応", "写像", "相似", "フラクタル", "鏡", "共鳴"],
  manifestation: ["顕現", "形", "現象", "顕れ", "発現", "生成", "創造"],
  purification: ["浄化", "禊", "澄", "清", "祓", "洗", "純化"],
  governance: ["統治", "君位", "臣", "治", "政", "タカアマハラ", "高天原"],
};

// ── evidenceQuote の品質スコア計算 ───────────────────
function evaluateEvidenceQuality(
  evidenceQuote: string | null,
  reason: string
): number {
  if (!evidenceQuote || evidenceQuote.length < 10) return 0;

  let quality = 0;

  // 長さボーナス（50文字以上で+0.1、100文字以上で+0.2）
  if (evidenceQuote.length >= 100) quality += 0.2;
  else if (evidenceQuote.length >= 50) quality += 0.1;

  // 専門用語の含有（天聞ドメイン固有語）
  const domainTerms = [
    "言霊", "カタカムナ", "水火", "天津金木", "五十音", "宿曜",
    "法華", "般若", "サンスクリット", "古事記", "神代", "フトマニ",
    "正中", "循環", "螺旋", "陰陽", "アーク", "契約",
  ];
  const termHits = domainTerms.filter((t) => evidenceQuote.includes(t)).length;
  quality += Math.min(termHits * 0.05, 0.3);

  // reason の品質
  if (reason && reason.length >= 20) quality += 0.1;

  return Math.min(quality, 1.0);
}

// ── fromLawId の再マッピング ─────────────────────────
function findBestLawId(
  text: string,
  lawKeys: Array<{ lawKey: string; title: string; summary: string }>
): string | null {
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const law of lawKeys) {
    let score = 0;
    const lawText = `${law.title} ${law.summary}`;

    // テキスト内のキーワード一致
    for (const [axis, keywords] of Object.entries(AXIS_KEYWORDS)) {
      for (const kw of keywords) {
        if (text.includes(kw) && lawText.includes(kw)) {
          score += 1;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = law.lawKey;
    }
  }

  return bestScore >= 2 ? bestKey : null;
}

// ── メイン ────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dbPathIdx = args.indexOf("--db-path");
  const dbPath = dbPathIdx >= 0 ? args[dbPathIdx + 1] : DEFAULT_DB_PATH;

  console.log(`[ACCEPT_SYNAPSES_V1] 開始 (dry_run=${dryRun}, db=${dbPath})`);

  const db = new Database(dbPath, { readonly: false });
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  try {
    // ── Step 0: バックアップ ─────────────────────────
    if (!dryRun) {
      console.log("[ACCEPT_SYNAPSES_V1] Step 0: バックアップ作成...");
      db.exec(`
        CREATE TABLE IF NOT EXISTS kokuzo_synapses_backup_v1 AS
          SELECT * FROM kokuzo_synapses;
      `);
      const backupCount = (
        db
          .prepare("SELECT COUNT(*) as c FROM kokuzo_synapses_backup_v1")
          .get() as { c: number }
      ).c;
      console.log(`  バックアップ: ${backupCount} 件`);
    }

    // ── Step 1: 全 PROPOSED シナプスを取得 ───────────
    console.log("[ACCEPT_SYNAPSES_V1] Step 1: PROPOSED シナプス取得...");

    const proposedSynapses = db
      .prepare(
        `
      SELECT id, fromLawId, toDoc, toPdfPage, score, reason, evidenceQuote, status
      FROM kokuzo_synapses
      WHERE status = 'PROPOSED' OR status = 'proposed'
    `
      )
      .all() as Array<{
      id: string;
      fromLawId: string;
      toDoc: string;
      toPdfPage: number;
      score: number;
      reason: string;
      evidenceQuote: string | null;
      status: string;
    }>;

    console.log(`  PROPOSED: ${proposedSynapses.length} 件`);

    // ── Step 2: khs_laws を取得（fromLawId 再マッピング用）
    console.log("[ACCEPT_SYNAPSES_V1] Step 2: khs_laws 取得...");

    const allLaws = db
      .prepare("SELECT lawKey, title, summary FROM khs_laws")
      .all() as Array<{ lawKey: string; title: string; summary: string }>;

    console.log(`  khs_laws: ${allLaws.length} 件`);

    // ── Step 3: 各シナプスを判定 ────────────────────
    console.log("[ACCEPT_SYNAPSES_V1] Step 3: ACCEPTED/REJECTED 判定...");

    const updateStmt = db.prepare(`
      UPDATE kokuzo_synapses
      SET status = ?, fromLawId = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);

    // evolution_ledger_v1 テーブルの存在確認
    const ledgerExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='evolution_ledger_v1'"
      )
      .get();

    const insertLedger = ledgerExists
      ? db.prepare(`
        INSERT INTO evolution_ledger_v1
        (eventId, sourceCard, changedLayer, afterSummary, status, createdAt)
        VALUES (?, ?, ?, ?, 'accepted', datetime('now'))
      `)
      : null;

    let acceptedCount = 0;
    let rejectedCount = 0;
    let remappedCount = 0;
    const uniqueFromLawIds = new Set<string>();
    const statusDistribution: Record<string, number> = {};

    const judgeTransaction = db.transaction(() => {
      for (const synapse of proposedSynapses) {
        // evidence 品質評価
        const evidenceQuality = evaluateEvidenceQuality(
          synapse.evidenceQuote,
          synapse.reason
        );

        // 総合スコア = base score + evidence quality bonus
        const totalScore = synapse.score + evidenceQuality * 0.3;

        // fromLawId の再マッピング
        let newFromLawId = synapse.fromLawId;
        if (
          synapse.fromLawId === "KHS_KERNEL:SUIKA_CYCLE" ||
          synapse.fromLawId.includes("SUIKA_CYCLE")
        ) {
          // evidenceQuote + reason からより適切な Law を探す
          const searchText = `${synapse.reason || ""} ${synapse.evidenceQuote || ""}`;
          const betterLaw = findBestLawId(searchText, allLaws);
          if (betterLaw) {
            newFromLawId = betterLaw;
            remappedCount++;
          }
        }

        // 判定
        let newStatus: string;
        if (totalScore >= 0.7) {
          newStatus = "ACCEPTED";
          acceptedCount++;
        } else if (totalScore >= 0.4) {
          // 中間帯: evidence の長さで判定
          if (synapse.evidenceQuote && synapse.evidenceQuote.length >= 30) {
            newStatus = "ACCEPTED";
            acceptedCount++;
          } else {
            newStatus = "REJECTED";
            rejectedCount++;
          }
        } else {
          newStatus = "REJECTED";
          rejectedCount++;
        }

        statusDistribution[newStatus] =
          (statusDistribution[newStatus] || 0) + 1;
        uniqueFromLawIds.add(newFromLawId);

        if (!dryRun) {
          updateStmt.run(newStatus, newFromLawId, synapse.id);
        }
      }

      // evolution_ledger への封印
      if (!dryRun && insertLedger) {
        const changes = {
          accepted: acceptedCount,
          rejected: rejectedCount,
          remapped: remappedCount,
          uniqueFromLawIds: uniqueFromLawIds.size,
        };
        insertLedger.run(
          `evo_synapse_accept_${Date.now()}_${randomUUID().substring(0, 10)}`,
          "ACCEPT_SYNAPSES_V1",
          "synapse_acceptance",
          JSON.stringify(changes, null, 2)
        );
      }
    });

    if (!dryRun) {
      judgeTransaction();
    } else {
      // dry-run でも集計
      for (const synapse of proposedSynapses) {
        const evidenceQuality = evaluateEvidenceQuality(synapse.evidenceQuote, synapse.reason);
        const totalScore = synapse.score + evidenceQuality * 0.3;
        let newFromLawId = synapse.fromLawId;
        if (synapse.fromLawId.includes("SUIKA_CYCLE")) {
          const searchText = `${synapse.reason || ""} ${synapse.evidenceQuote || ""}`;
          const betterLaw = findBestLawId(searchText, allLaws);
          if (betterLaw) { newFromLawId = betterLaw; remappedCount++; }
        }
        if (totalScore >= 0.7) { acceptedCount++; statusDistribution["ACCEPTED"] = (statusDistribution["ACCEPTED"] || 0) + 1; }
        else if (totalScore >= 0.4 && synapse.evidenceQuote && synapse.evidenceQuote.length >= 30) { acceptedCount++; statusDistribution["ACCEPTED"] = (statusDistribution["ACCEPTED"] || 0) + 1; }
        else { rejectedCount++; statusDistribution["REJECTED"] = (statusDistribution["REJECTED"] || 0) + 1; }
        uniqueFromLawIds.add(newFromLawId);
      }
    }

    // ── Step 4: 結果レポート ─────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("[ACCEPT_SYNAPSES_V1] 結果レポート");
    console.log("=".repeat(60));
    console.log(`  総 PROPOSED: ${proposedSynapses.length}`);
    console.log(`  ACCEPTED: ${acceptedCount}`);
    console.log(`  REJECTED: ${rejectedCount}`);
    console.log(`  fromLawId 再マッピング: ${remappedCount}`);
    console.log(`  ユニーク fromLawId: ${uniqueFromLawIds.size}`);

    // 成功基準チェック
    console.log("\n  成功基準:");
    console.log(
      `    ${acceptedCount >= 200 ? "✅" : "❌"} ACCEPTED 200+: ${acceptedCount}`
    );
    console.log(
      `    ${uniqueFromLawIds.size >= 100 ? "✅" : "❌"} 多様な fromLawId 100+: ${uniqueFromLawIds.size}`
    );
    console.log(
      `    ${remappedCount > 0 ? "✅" : "❌"} SUIKA_CYCLE 以外に接続: ${remappedCount} 件再マッピング`
    );
    console.log("=".repeat(60));
  } finally {
    db.close();
  }
}

main();
