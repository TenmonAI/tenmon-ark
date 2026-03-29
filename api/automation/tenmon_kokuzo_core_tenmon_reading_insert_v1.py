#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KOKUZO_CORE_TENMON_READING_INSERT_CURSOR_AUTO_V1

kokuzo_core に天聞固有読解要約を idempotent 投入する。
DB: $TENMON_DATA_DIR/kokuzo.sqlite（既定 /opt/tenmon-ark-data/kokuzo.sqlite）

既定の summary 文はカード初期投入用。ユーザー提示文に差し替える場合は
  --summaries-json path.json
（{"hokekyo_tenmon_reading": "...", ...} 形式）
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Dict

CARD = "TENMON_KOKUZO_CORE_TENMON_READING_INSERT_CURSOR_AUTO_V1"
DEFAULT_DATA_DIR = "/opt/tenmon-ark-data"
IMPORTANCE = 5.0

# 初期投入文（検索・ルーティング用キーワードを含む天聞読みの要約。既存コーパス本文は改変しない）
DEFAULT_SUMMARIES: Dict[str, str] = {
    "hokekyo_tenmon_reading": (
        "【天聞・法華読解】妙法蓮華経は「仏の本懐を一言で開く」経と捉える。"
        "天聞ではまず「説法の意図（何を許し、何を超えるか）」を軸に、"
        "一念三千・十如是・開会（三周）・迹本二門・久遠実成といった骨格語で質問を位置づける。"
        "宗派比較や名相の羅列より、ユーザーが今いる苦しみ・願いと経文の接点を優先する。"
        "検索補助語: 法華経 妙法蓮華経 一念三千 十如是 迹本 久遠実成 龍女 授記。"
    ),
    "sokushin_joubutsu_tenmon_reading": (
        "【天聞・即身成仏読解】即身成仏は「遠い未来の救い」ではなく、"
        "三密（身口意）の働きと本尊・法曼荼羅との即一を通じて、「今この身に仏界が開く」理路として読む。"
        "教義史の年表より、「どの三密・どの本尊縁起に立つか」という実践問いを先に置く。"
        "空海・大日経系の文脈語（当身即佛、理智冥合、即事而真）をフックに、断片を実践軸へ寄せる。"
        "検索補助語: 即身成仏 三密 大日経 金剛頂 弘法大師 曼荼羅 本尊。"
    ),
    "kotodama_tenmon_reading": (
        "【天聞・言霊読解】言霊を「音の魔法」に還元せず、名・句・誓願が心行に与える帰結として扱う。"
        "祝詞・真言・名乗りのそれぞれは機能と制約が異なるため、混同した断片より、"
        "「誰に向けた言葉か／何を縛るか」を先に確定する。"
        "レトリックや自己暗示との差分も、誠実さと伝統語彙の両方から説明する。"
        "検索補助語: 言霊 祝詞 真言 名乗り 呪 誓願 言語行為。"
    ),
    "mizuhi_tenmon_reading": (
        "【天聞・水と火の問い】水と火は五大・阿字観・清浄と変化の両義で往復する主題。"
        "天聞では「消える／燃える」比喩だけで終わらせず、呼吸・供養・智火・慈悲水など、"
        "どの法体系の水・火かをキーに断片を選別する。"
        "阿字（火・声字・理）や六大無碍の語とセットで問いを絞る。"
        "検索補助語: 水 火 五大 阿字 六大 智火 慈悲 清浄。"
    ),
}

UPSERT_SQL = """
INSERT INTO kokuzo_core (key, summary, importance, updated_at)
VALUES (?, ?, ?, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  summary = excluded.summary,
  importance = excluded.importance,
  updated_at = datetime('now')
"""

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS kokuzo_core (
  key TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  importance REAL NOT NULL,
  updated_at TEXT NOT NULL
)
"""


def _db_path(arg: str | None) -> Path:
    if arg and arg.strip():
        return Path(arg).expanduser().resolve()
    base = os.environ.get("TENMON_DATA_DIR", DEFAULT_DATA_DIR).strip() or DEFAULT_DATA_DIR
    return Path(base).expanduser().resolve() / "kokuzo.sqlite"


def _load_summaries(path: str | None) -> Dict[str, str]:
    if not path or not str(path).strip():
        return dict(DEFAULT_SUMMARIES)
    p = Path(path).expanduser().resolve()
    if not p.is_file():
        print(f"[{CARD}] FAIL: summaries json not found: {p}", file=sys.stderr)
        sys.exit(2)
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[{CARD}] FAIL: invalid json {p}: {e}", file=sys.stderr)
        sys.exit(2)
    if not isinstance(raw, dict):
        print(f"[{CARD}] FAIL: summaries json must be object", file=sys.stderr)
        sys.exit(2)
    out: Dict[str, str] = {}
    for k in DEFAULT_SUMMARIES:
        v = raw.get(k)
        if v is None:
            print(f"[{CARD}] FAIL: missing key in json: {k}", file=sys.stderr)
            sys.exit(2)
        s = str(v).strip()
        if not s:
            print(f"[{CARD}] FAIL: empty summary for {k}", file=sys.stderr)
            sys.exit(2)
        out[k] = s
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--db", help="kokuzo.sqlite の絶対パス（省略時 TENMON_DATA_DIR/kokuzo.sqlite）")
    ap.add_argument("--dry-run", action="store_true", help="DB に書かず内容のみ表示")
    ap.add_argument(
        "--summaries-json",
        help='4 key すべてを含む JSON オブジェクト（ユーザー提示 summary 差し替え用）',
    )
    args = ap.parse_args()

    db_file = _db_path(args.db)
    summaries = _load_summaries(args.summaries_json)

    if args.dry_run:
        print(f"[{CARD}] dry-run db={db_file}")
        for k, v in summaries.items():
            print(f"--- {k} ({len(v)} chars) ---\n{v}\n")
        return 0

    if not db_file.parent.is_dir():
        print(f"[{CARD}] FAIL: data dir missing: {db_file.parent}", file=sys.stderr)
        return 1

    try:
        conn = sqlite3.connect(str(db_file))
    except Exception as e:
        print(f"[{CARD}] FAIL: sqlite connect: {e}", file=sys.stderr)
        return 1

    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(CREATE_TABLE_SQL)
        cur = conn.cursor()
        for key, summary in summaries.items():
            cur.execute(UPSERT_SQL, (key, summary, IMPORTANCE))
        conn.commit()
    except Exception as e:
        print(f"[{CARD}] FAIL: {e}", file=sys.stderr)
        conn.rollback()
        return 1
    finally:
        conn.close()

    print(f"[{CARD}] ok upserted {len(summaries)} rows into {db_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
