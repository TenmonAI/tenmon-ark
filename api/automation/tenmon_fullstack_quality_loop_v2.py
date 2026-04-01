#!/usr/bin/env python3
"""TENMON_ARK 全機能品質向上ループ v2 - 8時間自律稼働"""
import datetime
import json
import sqlite3
import subprocess
import time
import urllib.request

KEY = "149d43d4d8902fd7bb360c723ac910697a876c208d16423771eb96dc553f9bf6"
BASE = "http://127.0.0.1:3000"
MAX_CYCLES = 16
MAX_SECONDS = 28800
START = time.time()

CHAT_PROBES = [
    ("法華経とは何か、長文で詳しく説明せよ", "HOKEKYO", 300),
    ("空海の声字実相義の核心を長文で", "KUKAI", 300),
    ("空海の三密とは何か、長文で", "KUKAI", 200),
    ("言霊とは何か", "kotodama_hisho", 30),
    ("カタカムナとは何か詳しく", "katakamuna", 80),
    ("法華経と空海の関係を長文で", "HOKEKYO", 200),
]


def api(path, method="GET", data=None, timeout=60):
    try:
        req = urllib.request.Request(
            f"{BASE}{path}",
            data=json.dumps(data).encode() if data else None,
            headers={"Content-Type": "application/json", "X-Founder-Key": KEY},
            method=method,
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read()), True
    except Exception as e:
        return {"error": str(e)}, False


def should_stop(cycle):
    if cycle >= MAX_CYCLES:
        print(f"STOP: max_cycles={MAX_CYCLES}")
        return True
    if time.time() - START >= MAX_SECONDS:
        print("STOP: 8時間経過")
        return True
    return False


def run_probes():
    passed, fails = 0, []
    for msg, exp_ck, min_c in CHAT_PROBES:
        d, ok = api("/api/chat", "POST", {"message": msg, "threadId": f"loop_{exp_ck}"})
        c = len(d.get("response", "")) if ok else 0
        ck = d.get("decisionFrame", {}).get("ku", {}).get("centerKey", "") if ok else ""
        ok2 = c >= min_c and ck == exp_ck
        print(f"  {'✅' if ok2 else '❌'} {msg[:30]:30} | {c:4}字 | ck={ck}")
        if ok2:
            passed += 1
        else:
            fails.append(
                {
                    "msg": msg,
                    "chars": c,
                    "ck": ck,
                    "exp_ck": exp_ck,
                    "min_c": min_c,
                }
            )
        time.sleep(0.3)
    return passed, len(CHAT_PROBES), fails


def run_feature_check():
    results = {}
    for path in [
        "/api/book/projects",
        "/api/persona/list",
        "/api/connectors/list",
        "/api/ocr/runtime/verify",
    ]:
        d, ok = api(path)
        results[path] = ok and d.get("ok", False)
        print(f"  {'✅' if results[path] else '❌'} {path}")

    try:
        db = sqlite3.connect("/opt/tenmon-ark-data/kokuzo.sqlite")
        tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        db.close()
        for t in ["writing_projects", "persona_profiles", "source_registry", "memory_units"]:
            results[f"db:{t}"] = t in tables
    except Exception:
        pass
    return results


def auto_fix(fails):
    longform = [f for f in fails if f.get("chars", 0) < f.get("min_c", 300)]
    if not longform:
        return True
    print("  [自動修復] build + restart...")
    r = subprocess.run(
        [
            "bash",
            "-c",
            "cd /opt/tenmon-ark-repo/api && npm run build 2>&1 | tail -3 && systemctl restart tenmon-ark-api.service && sleep 5",
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    print(f"  {'OK' if r.returncode == 0 else 'FAIL'}")
    return r.returncode == 0


cycle = 0
consec_fails = 0
history = []

while not should_stop(cycle):
    cycle += 1
    elapsed_h = (time.time() - START) / 3600
    remaining_h = (MAX_SECONDS - (time.time() - START)) / 3600
    now = datetime.datetime.now().strftime("%H:%M")
    print(f"\n{'=' * 58}")
    print(f"品質ループ #{cycle}/{MAX_CYCLES} | {now} | 経過{elapsed_h:.1f}h | 残{remaining_h:.1f}h")
    print(f"{'=' * 58}")

    print("--- 会話品質 ---")
    chat_pass, chat_total, fails = run_probes()
    print(f"  会話: {chat_pass}/{chat_total} PASS")

    print("--- 機能確認 ---")
    feature_results = run_feature_check()

    all_ok = (chat_pass == chat_total) and all(feature_results.values())
    score = int(chat_pass / chat_total * 100) if chat_total else 0
    history.append({"cycle": cycle, "time": now, "elapsed_h": round(elapsed_h, 2), "score": score, "all_ok": all_ok})
    print(f"\n  総合: {'🎉 PASS' if all_ok else '⚠️ FAIL'} | 会話{score}%")

    if all_ok:
        consec_fails = 0
    else:
        consec_fails += 1
        if fails:
            for f in fails[:3]:
                print(f"    ❌ {f.get('msg', '')[:35]} | chars={f.get('chars', 0)} exp_ck={f.get('exp_ck', '')}")
        if consec_fails >= 3:
            print("STOP: 3回連続FAIL")
            break
        auto_fix(fails)

    try:
        subprocess.run(
            ["git", "commit", "--allow-empty", "-m", f"quality: cycle#{cycle} {score}% {now}"],
            capture_output=True,
            timeout=30,
            cwd="/opt/tenmon-ark-repo",
        )
    except Exception:
        pass

    if not should_stop(cycle):
        wait = 600
        nxt = datetime.datetime.now() + datetime.timedelta(seconds=wait)
        print(f"\n  次まで{wait//60}分待機... ({nxt.strftime('%H:%M')})")
        time.sleep(wait)

print(f"\n{'=' * 58}")
print(f"完了: {cycle}サイクル | 経過{(time.time() - START) / 3600:.1f}h")
print(f"{'=' * 58}")
for h in history:
    print(f"  #{h['cycle']:>2} {h['time']} {h['elapsed_h']:>4.1f}h {h['score']:>4}% {'✅' if h['all_ok'] else '❌'}")
