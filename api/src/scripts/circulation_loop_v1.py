#!/usr/bin/env python3
"""
CIRCULATION_LOOP_V1 — 天聞アーク循環ループ再点火スクリプト
==========================================================
cron で 5 分ごとに実行。以下の 4 ステップを順次実行する:

  Step 1: reflection_queue_v1 → pending 件数チェック
  Step 2: kokuzo_synapses → PENDING → ACCEPTED 昇格
  Step 3: evolution_ledger_v1 → 最新イベント要約
  Step 4: synapse_log → 循環メトリクス記録

安全設計:
  - 全 SQL は try-except で保護
  - 1 回の実行で最大 50 件の ACCEPTED 化（暴走防止）
  - ログは stdout + circulation_loop.log に出力
  - --dry-run オプションで書き込みなし確認可能

使用法:
  python3 circulation_loop_v1.py [--dry-run] [--db-path /path/to/kokuzo.sqlite]

cron 登録例:
  */5 * * * * cd /opt/tenmon-ark-repo && python3 api/src/scripts/circulation_loop_v1.py >> /var/log/tenmon/circulation_loop.log 2>&1
"""

import argparse
import json
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone

# ── 定数 ──────────────────────────────────────────────
DEFAULT_DB_PATH = os.environ.get(
    "KOKUZO_DB_PATH", "/opt/tenmon-ark-data/kokuzo.sqlite"
)
MAX_ACCEPT_PER_RUN = 50
LOG_PREFIX = "[CIRCULATION_LOOP_V1]"

# ── ユーティリティ ────────────────────────────────────


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"{ts} {LOG_PREFIX} {msg}", flush=True)


def safe_query(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list:
    """SELECT のみ。例外は空リストで返す。"""
    try:
        cur = conn.execute(sql, params)
        return cur.fetchall()
    except Exception as e:
        log(f"  WARN: query failed: {e}")
        return []


def safe_scalar(conn: sqlite3.Connection, sql: str, params: tuple = ()):
    """スカラー値を返す。失敗時は None。"""
    rows = safe_query(conn, sql, params)
    if rows and rows[0]:
        return rows[0][0]
    return None


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    val = safe_scalar(
        conn,
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    )
    return bool(val and val > 0)


# ── Step 1: reflection_queue_v1 チェック ──────────────


def step1_reflection_queue(conn: sqlite3.Connection) -> dict:
    """pending 件数と最新 pending の age を返す。"""
    log("Step 1: reflection_queue_v1 チェック")
    result = {"step": 1, "name": "reflection_queue_check"}

    if not table_exists(conn, "reflection_queue_v1"):
        result["status"] = "table_not_found"
        log("  reflection_queue_v1 テーブルが存在しません")
        return result

    pending = safe_scalar(
        conn,
        "SELECT COUNT(*) FROM reflection_queue_v1 WHERE status='pending'",
    )
    total = safe_scalar(conn, "SELECT COUNT(*) FROM reflection_queue_v1")
    oldest_pending = safe_scalar(
        conn,
        "SELECT MIN(created_at) FROM reflection_queue_v1 WHERE status='pending'",
    )

    result["pending_count"] = pending or 0
    result["total_count"] = total or 0
    result["oldest_pending"] = oldest_pending
    result["status"] = "ok"

    log(f"  pending: {pending}, total: {total}, oldest: {oldest_pending}")
    return result


# ── Step 2: kokuzo_synapses ACCEPTED 化 ──────────────


def step2_synapses_accept(conn: sqlite3.Connection, dry_run: bool) -> dict:
    """PENDING ステータスの synapses を ACCEPTED に昇格する。"""
    log("Step 2: kokuzo_synapses ACCEPTED 化")
    result = {"step": 2, "name": "synapses_accept"}

    if not table_exists(conn, "kokuzo_synapses"):
        result["status"] = "table_not_found"
        log("  kokuzo_synapses テーブルが存在しません")
        return result

    # PENDING 件数を確認
    pending = safe_scalar(
        conn,
        "SELECT COUNT(*) FROM kokuzo_synapses WHERE status='PENDING'",
    )
    result["pending_before"] = pending or 0

    if not pending or pending == 0:
        result["status"] = "no_pending"
        result["accepted_count"] = 0
        log("  PENDING なし — スキップ")
        return result

    # score >= 0.6 の PENDING を ACCEPTED に昇格（上限 MAX_ACCEPT_PER_RUN）
    candidates = safe_query(
        conn,
        """
        SELECT id, fromLawId, score, reason
        FROM kokuzo_synapses
        WHERE status = 'PENDING' AND score >= 0.6
        ORDER BY score DESC
        LIMIT ?
        """,
        (MAX_ACCEPT_PER_RUN,),
    )

    accepted_count = 0
    if not dry_run and candidates:
        try:
            ids = [row[0] for row in candidates]
            placeholders = ",".join(["?"] * len(ids))
            conn.execute(
                f"UPDATE kokuzo_synapses SET status='ACCEPTED' WHERE id IN ({placeholders})",
                ids,
            )
            conn.commit()
            accepted_count = len(ids)
        except Exception as e:
            log(f"  ERROR: ACCEPTED 化失敗: {e}")
            result["error"] = str(e)
    elif dry_run:
        accepted_count = len(candidates)
        log(f"  DRY-RUN: {accepted_count} 件を ACCEPTED 化予定")

    result["accepted_count"] = accepted_count
    result["status"] = "ok"
    log(f"  ACCEPTED 化: {accepted_count} 件 (PENDING: {pending})")
    return result


# ── Step 3: evolution_ledger_v1 要約 ──────────────────


def step3_evolution_summary(conn: sqlite3.Connection) -> dict:
    """直近 24h の evolution_ledger_v1 イベント要約を返す。"""
    log("Step 3: evolution_ledger_v1 要約")
    result = {"step": 3, "name": "evolution_summary"}

    if not table_exists(conn, "evolution_ledger_v1"):
        result["status"] = "table_not_found"
        log("  evolution_ledger_v1 テーブルが存在しません")
        return result

    total = safe_scalar(conn, "SELECT COUNT(*) FROM evolution_ledger_v1")
    recent_24h = safe_scalar(
        conn,
        "SELECT COUNT(*) FROM evolution_ledger_v1 WHERE createdAt >= datetime('now', '-1 day')",
    )
    latest = safe_scalar(
        conn,
        "SELECT MAX(createdAt) FROM evolution_ledger_v1",
    )

    # sourceCard 別の集計
    by_source = safe_query(
        conn,
        """
        SELECT sourceCard, COUNT(*) as cnt
        FROM evolution_ledger_v1
        WHERE createdAt >= datetime('now', '-7 days')
        GROUP BY sourceCard
        ORDER BY cnt DESC
        LIMIT 5
        """,
    )

    result["total"] = total or 0
    result["recent_24h"] = recent_24h or 0
    result["latest"] = latest
    result["top_sources_7d"] = [
        {"source": row[0], "count": row[1]} for row in by_source
    ]
    result["status"] = "ok"

    log(f"  total: {total}, 24h: {recent_24h}, latest: {latest}")
    return result


# ── Step 4: synapse_log メトリクス記録 ────────────────


def step4_synapse_metrics(conn: sqlite3.Connection, dry_run: bool, metrics: dict) -> dict:
    """循環ループの実行メトリクスを synapse_log に記録する。"""
    log("Step 4: synapse_log メトリクス記録")
    result = {"step": 4, "name": "synapse_metrics_log"}

    if not table_exists(conn, "synapse_log"):
        result["status"] = "table_not_found"
        log("  synapse_log テーブルが存在しません")
        return result

    if dry_run:
        result["status"] = "dry_run_skip"
        log("  DRY-RUN: synapse_log 記録をスキップ")
        return result

    try:
        log_id = f"CL_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        conn.execute(
            """
            INSERT INTO synapse_log (id, createdAt, eventType, payload)
            VALUES (?, datetime('now'), 'CIRCULATION_LOOP_V1', ?)
            """,
            (log_id, json.dumps(metrics, ensure_ascii=False)),
        )
        conn.commit()
        result["log_id"] = log_id
        result["status"] = "ok"
        log(f"  記録完了: {log_id}")
    except Exception as e:
        log(f"  ERROR: synapse_log 記録失敗: {e}")
        result["status"] = "error"
        result["error"] = str(e)

    return result


# ── メイン ────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="CIRCULATION_LOOP_V1 — 天聞アーク循環ループ再点火"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="書き込みなしで確認のみ実行",
    )
    parser.add_argument(
        "--db-path",
        default=DEFAULT_DB_PATH,
        help=f"kokuzo.sqlite のパス (default: {DEFAULT_DB_PATH})",
    )
    args = parser.parse_args()

    log(f"開始 (dry_run={args.dry_run}, db={args.db_path})")

    if not os.path.exists(args.db_path):
        log(f"ERROR: DB ファイルが見つかりません: {args.db_path}")
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")

    results = []
    try:
        # Step 1: reflection_queue チェック
        r1 = step1_reflection_queue(conn)
        results.append(r1)

        # Step 2: synapses ACCEPTED 化
        r2 = step2_synapses_accept(conn, args.dry_run)
        results.append(r2)

        # Step 3: evolution_ledger 要約
        r3 = step3_evolution_summary(conn)
        results.append(r3)

        # Step 4: メトリクス記録
        metrics = {
            "reflection_pending": r1.get("pending_count", 0),
            "synapses_accepted": r2.get("accepted_count", 0),
            "evolution_24h": r3.get("recent_24h", 0),
            "evolution_total": r3.get("total", 0),
            "dry_run": args.dry_run,
        }
        r4 = step4_synapse_metrics(conn, args.dry_run, metrics)
        results.append(r4)

    finally:
        conn.close()

    # 結果サマリー
    log("=" * 60)
    log("循環ループ完了")
    for r in results:
        status = r.get("status", "unknown")
        name = r.get("name", "?")
        log(f"  Step {r.get('step')}: {name} → {status}")
    log("=" * 60)

    # JSON 出力（MC 連携用）
    output = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "steps": results,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
