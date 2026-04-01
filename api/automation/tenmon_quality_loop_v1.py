#!/usr/bin/env python3
import datetime
import json
import time
import urllib.request

KEY = "149d43d4d8902fd7bb360c723ac910697a876c208d16423771eb96dc553f9bf6"
BASE = "http://127.0.0.1:3000"
MAX_CYCLES = 16
MAX_SECONDS = 28800  # 8h

CHAT_PROBES = [
    ("法華経とは何か、長文で詳しく説明せよ", "HOKEKYO", 300),
    ("空海の声字実相義の核心を長文で", "KUKAI", 300),
    ("言霊とは何か", "kotodama_hisho", 30),
    ("カタカムナとは何か詳しく", "katakamuna", 80),
]


def api(path, method="GET", data=None, timeout=30):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json", "X-Founder-Key": KEY},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def run_once(cycle):
    print(f"\n=== cycle {cycle} @ {datetime.datetime.now().strftime('%H:%M:%S')} ===")
    passed = 0
    for msg, exp_ck, min_chars in CHAT_PROBES:
        try:
            d = api("/api/chat", "POST", {"message": msg, "threadId": f"quality_{cycle}_{exp_ck}"})
            resp = str(d.get("response", ""))
            ku = ((d.get("decisionFrame") or {}).get("ku") or {})
            ck = str(ku.get("centerKey", ""))
            ok = len(resp) >= min_chars and ck == exp_ck
            print(f"{'OK' if ok else 'NG'} chat {msg[:18]} | {len(resp)} chars | ck={ck}")
            if ok:
                passed += 1
        except Exception as e:
            print(f"NG chat {msg[:18]} | error={e}")

    try:
        b = api("/api/book/projects")
        print(f"{'OK' if b.get('ok') else 'NG'} book/projects count={b.get('count')}")
    except Exception as e:
        print(f"NG book/projects error={e}")

    try:
        p = api("/api/persona/list")
        print(f"{'OK' if p.get('ok') else 'NG'} persona/list count={p.get('count')}")
    except Exception as e:
        print(f"NG persona/list error={e}")

    return passed == len(CHAT_PROBES)


def main():
    start = time.time()
    cycle = 0
    while cycle < MAX_CYCLES and (time.time() - start) < MAX_SECONDS:
        cycle += 1
        ok = run_once(cycle)
        if not ok:
            print("warn: chat probes not fully passed")
        if cycle < MAX_CYCLES and (time.time() - start) < MAX_SECONDS:
            time.sleep(600)
    print("\nquality loop completed")


if __name__ == "__main__":
    main()
