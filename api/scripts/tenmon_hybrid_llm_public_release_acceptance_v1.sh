#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000/api/chat}"
SUKUYOU_BASE="${SUKUYOU_BASE:-http://localhost:3000/api/sukuyou/guidance}"
FEEDBACK_BASE="${FEEDBACK_BASE:-http://localhost:3000/api/feedback}"
OUT_JSON="${OUT_JSON:-/tmp/tenmon_hybrid_llm_public_release_acceptance_v1.json}"

python3 - <<'PY'
import json, subprocess, time, uuid, os

BASE = os.environ.get("BASE", "http://localhost:3000/api/chat")
SUKUYOU_BASE = os.environ.get("SUKUYOU_BASE", "http://localhost:3000/api/sukuyou/guidance")
FEEDBACK_BASE = os.environ.get("FEEDBACK_BASE", "http://localhost:3000/api/feedback")
OUT_JSON = os.environ.get("OUT_JSON", "/tmp/tenmon_hybrid_llm_public_release_acceptance_v1.json")

def post(url, payload):
    raw = subprocess.check_output([
        "curl","-s","-X","POST",url,
        "-H","Content-Type: application/json",
        "-d",json.dumps(payload, ensure_ascii=False),
    ], text=True)
    try:
        return json.loads(raw)
    except Exception:
        return {"_raw": raw}

def run():
    out = {}

    # A sacred
    sacred_qs = ["言霊とは何か", "カタカムナとは何か"]
    sacred = []
    for q in sacred_qs:
        d = post(BASE, {"message": q, "sessionId": f"public-sacred-{uuid.uuid4().hex[:6]}"})
        r = str(d.get("response", ""))
        sacred.append({
            "q": q,
            "chars": len(r),
            "blocked": "内部知識を整理" in r,
            "has_core_word": any(k in r for k in ["水火", "天津金木", "言靈", "構造", "解読"]),
            "routeReason": ((d.get("decisionFrame") or {}).get("ku") or {}).get("routeReason"),
        })
    out["A_sacred"] = sacred

    # B general
    b1 = post(BASE, {"message": "おはよう", "sessionId": f"public-general-{uuid.uuid4().hex[:6]}"})
    b2 = post(BASE, {"message": "最近疲れた", "sessionId": f"public-general-{uuid.uuid4().hex[:6]}"})
    out["B_general"] = {
        "greeting_chars": len(str(b1.get("response", ""))),
        "greeting_route": ((b1.get("decisionFrame") or {}).get("ku") or {}).get("routeReason"),
        "fatigue_chars": len(str(b2.get("response", ""))),
        "fatigue_route": ((b2.get("decisionFrame") or {}).get("ku") or {}).get("routeReason"),
    }

    # C sukuyou 3-turn + leak check
    thread = f"public-sukuyou-{uuid.uuid4().hex[:8]}"
    seed = "[SUKUYOU_SEED] honmeiShuku=翼宿 / disasterType=過剰責任型 / reversalAxis=外発→内集 / rawConcern=仕事の悩み"
    c1 = post(BASE, {"message": seed, "sessionId": thread, "threadId": thread})
    time.sleep(1.0)
    c2 = post(BASE, {"message": "仕事で何から変えるべき？", "sessionId": thread, "threadId": thread})
    time.sleep(1.0)
    c3 = post(BASE, {"message": "2026年の運気はどうなる？", "sessionId": thread, "threadId": thread})
    turns = [c1, c2, c3]
    leak_markers = ["[SUKUYOU_SEED]", "honmeiShuku=", "disasterType=", "reversalAxis=", "{", "}"]
    turn_rows = []
    for i, d in enumerate(turns, start=1):
        r = str(d.get("response", ""))
        turn_rows.append({
            "turn": i,
            "chars": len(r),
            "routeReason": ((d.get("decisionFrame") or {}).get("ku") or {}).get("routeReason"),
            "has_wing": ("翼" in r),
            "template_leak": any(x in r for x in ["具体化してください", "質問を受け取りました", "短く送って"]),
            "raw_seed_leak": any(x in r for x in leak_markers),
        })
    out["C_sukuyou"] = {
        "threadId": thread,
        "turns": turn_rows,
        "title_natural_hint": "☆ 宿曜鑑定",
    }

    # D feedback
    fb = post(FEEDBACK_BASE, {
        "category": "チャット機能",
        "priority": "中",
        "title": "PUBLIC_RELEASE_ACCEPTANCE",
        "detail": "generate-card public release acceptance",
        "device": "curl",
    })
    rcpt = fb.get("receiptNumber", "")
    gc = post(FEEDBACK_BASE + "/generate-card", {"receiptNumber": rcpt}) if rcpt else {"ok": False}
    out["D_feedback"] = {
        "receiptNumber": rcpt,
        "save_ok": bool(fb.get("ok")),
        "notionSaved": fb.get("notionSaved"),
        "generate_ok": bool(gc.get("ok")),
        "has_json_parse_error_text": ("JSON解析エラー" in str(gc.get("error", ""))),
        "parse_error_flag": bool((gc.get("card") or {}).get("_parseError", False)),
    }

    # E scale-ish quick loop
    scale_rows = []
    for i in range(1, 11):
        d = post(BASE, {"message": "言霊とは何か", "sessionId": f"public-scale-{i}"})
        r = str(d.get("response", ""))
        scale_rows.append({
            "i": i,
            "chars": len(r),
            "non_empty": len(r) > 0,
            "llm": (d.get("decisionFrame") or {}).get("llm"),
        })
        time.sleep(0.5)
    out["E_scale"] = {
        "runs": scale_rows,
        "non_empty_count": sum(1 for x in scale_rows if x["non_empty"]),
        "chars_gt_100_count": sum(1 for x in scale_rows if x["chars"] > 100),
    }

    out["PASS"] = {
        "A_sacred": all((not x["blocked"]) and x["chars"] > 100 for x in sacred),
        "B_general": out["B_general"]["greeting_chars"] > 30 and out["B_general"]["fatigue_chars"] > 100,
        "C_sukuyou": all((not t["template_leak"]) and (not t["raw_seed_leak"]) and t["chars"] > 100 for t in turn_rows[1:]),
        "D_feedback": out["D_feedback"]["save_ok"] and out["D_feedback"]["generate_ok"] and (not out["D_feedback"]["has_json_parse_error_text"]),
        "E_scale": out["E_scale"]["non_empty_count"] >= 9 and out["E_scale"]["chars_gt_100_count"] >= 7,
    }
    out["PASS"]["ALL"] = all(out["PASS"].values())

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(json.dumps({"PASS": out["PASS"], "OUT_JSON": OUT_JSON}, ensure_ascii=False, indent=2))

run()
PY
