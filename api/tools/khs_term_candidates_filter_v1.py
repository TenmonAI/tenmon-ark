#!/usr/bin/env python3
import argparse, re, sqlite3, sys, time
from collections import Counter

PAT = re.compile(r"^\s*(.{1,30}?)(とは|という|といふ|と云)")
STRIP = " \t\r\n　「」『』()（）[]【】<>〈〉《》〔〕"
ALLOW_CHARS = re.compile(r"^[0-9A-Za-zぁ-んァ-ヶ一-龥ー・]+$")

STOP_PREFIX = ("故に", "後に", "布斗麻", "此", "それ", "また", "夫", "凡そ")
STOP_SUFFIX = ("ノ", "ヲ", "ニ", "ハ", "ガ", "へ", "を", "に", "は", "が")

def norm_term(s: str) -> str:
    t = (s or "").strip(STRIP)
    t = t.strip(" ,，、。.:：;；")
    return t

def reason_of(term: str) -> str | None:
    if not term:
        return "empty"
    if len(term) < 2 or len(term) > 12:
        return "len"
    if ("。" in term) or ("、" in term):
        return "punct"
    if term.startswith(STOP_PREFIX):
        return "prefix_stop"
    if term.endswith(STOP_SUFFIX):
        return "suffix_stop"
    if not ALLOW_CHARS.match(term):
        return "charset"
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--limit", type=int, default=200000)
    ap.add_argument("--top", type=int, default=80)
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    rows = conn.execute(
        """
        SELECT l.lawKey, u.unitId, u.quote
        FROM khs_laws l
        JOIN khs_units u ON u.unitId = l.unitId
        WHERE l.status='proposed' AND l.lawType='DEF'
        ORDER BY l.lawKey ASC
        LIMIT ?
        """,
        (args.limit,)
    ).fetchall()

    raw_cnt = Counter()
    keep_cnt = Counter()
    reject_cnt = Counter()
    example = {}

    for lawKey, unitId, quote in rows:
        q = (quote or "").strip()
        head = q[:200]
        m = PAT.search(head)
        if not m:
            continue
        term = norm_term(m.group(1))
        raw_cnt[term] += 1
        r = reason_of(term)
        if r is not None:
            reject_cnt[r] += 1
            continue
        keep_cnt[term] += 1
        if term not in example:
            example[term] = (str(unitId), str(lawKey), head)

    print(f"[OBSERVE] def_rows={len(rows)} raw_terms={len(raw_cnt)} kept_terms={len(keep_cnt)} elapsed_s={time.time()-t0:.2f}")
    print("[REJECT_COUNTS]")
    for k, v in sorted(reject_cnt.items(), key=lambda x: (-x[1], x[0])):
        print(f" - {k}\t{v}")

    items = sorted(keep_cnt.items(), key=lambda x: (-x[1], x[0]))
    print(f"[OK] top={min(args.top, len(items))}")
    print("term\tcount\tunitId\tlawKey\thead200")
    for term, n in items[:args.top]:
        unitId, lawKey, head = example.get(term, ("", "", ""))
        head = head.replace("\t", " ").replace("\n", " ")
        print(f"{term}\t{n}\t{unitId}\t{lawKey}\t{head}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
