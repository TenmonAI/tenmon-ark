#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000/api/chat}"
SINCE="${SINCE:-5 minutes ago}"
OUT_JSON="${OUT_JSON:-/tmp/tenmon_public_release_log_monitor_v1.json}"

python3 - <<'PY'
import json, os, re, subprocess, time, uuid

BASE = os.environ.get("BASE", "http://localhost:3000/api/chat")
SINCE = os.environ.get("SINCE", "5 minutes ago")
OUT_JSON = os.environ.get("OUT_JSON", "/tmp/tenmon_public_release_log_monitor_v1.json")

def run_cmd(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)

def post(payload):
    try:
        raw = run_cmd([
            "curl", "-s", "--max-time", "40", "-X", "POST", BASE,
            "-H", "Content-Type: application/json",
            "-d", json.dumps(payload, ensure_ascii=False),
        ])
    except subprocess.CalledProcessError as e:
        return {"_error": f"curl_exit_{e.returncode}", "response": "", "decisionFrame": {"ku": {"routeReason": "MONITOR_TIMEOUT"}}}
    try:
        return json.loads(raw)
    except Exception:
        return {"_raw": raw}

def bool_failsoft(resp: dict) -> bool:
    text = str(resp.get("response", ""))
    df = resp.get("decisionFrame") or {}
    ku = df.get("ku") or {}
    rr = str(ku.get("routeReason") or "")
    llm = str(df.get("llm") or "")
    if "FAILSOFT" in rr.upper():
        return True
    if llm in ("failsoft", "failsoft_error"):
        return True
    if "少し待ってください" in text:
        return True
    return False

def main():
    journal = run_cmd(["journalctl", "-u", "tenmon-ark-api", "--since", SINCE, "--no-pager"])
    gemini_404 = len(re.findall(r"GEMINI_MODEL_NOT_FOUND|Gemini 404", journal))
    gemini_429 = len(re.findall(r"GEMINI_RATE_LIMIT|Gemini 429", journal))
    openai_quota = len(re.findall(r"insufficient_quota|OpenAI 429", journal))

    sampled = []
    prompts = [
        ("最近疲れた", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("言霊とは何か", f"mon-sacred-{uuid.uuid4().hex[:6]}"),
        ("こんにちは", f"mon-greet-{uuid.uuid4().hex[:6]}"),
        ("カタカムナとは何か", f"mon-sacred-{uuid.uuid4().hex[:6]}"),
        ("今週の優先順位を整理したい", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("最近眠りが浅い", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("法華経とは何か", f"mon-sacred-{uuid.uuid4().hex[:6]}"),
        ("今の自分に必要な一手は？", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("最近焦りが強い", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("天津金木とは何か", f"mon-sacred-{uuid.uuid4().hex[:6]}"),
        ("今日の段取りを整えたい", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("宿曜経とは何か", f"mon-sacred-{uuid.uuid4().hex[:6]}"),
        ("仕事の優先順位を絞りたい", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("言霊と水火の関係を教えて", f"mon-sacred-{uuid.uuid4().hex[:6]}"),
        ("ここ数日やる気が出ない", f"mon-general-{uuid.uuid4().hex[:6]}"),
        ("天聞アークの読み方を教えて", f"mon-general-{uuid.uuid4().hex[:6]}"),
    ]
    for msg, tid in prompts:
        r = post({"message": msg, "threadId": tid, "sessionId": tid})
        sampled.append(r)
        time.sleep(0.3)

    # Sukuyou carry sample
    stid = f"mon-sukuyou-{uuid.uuid4().hex[:8]}"
    seed = "[SUKUYOU_SEED] honmeiShuku=翼宿 / disasterType=過剰責任型 / reversalAxis=外発→内集 / rawConcern=仕事の悩み"
    _ = post({"message": seed, "threadId": stid, "sessionId": stid})
    time.sleep(0.6)
    sampled.append(post({"message": "今週で一番運気がいい日を教えて", "threadId": stid, "sessionId": stid}))
    time.sleep(0.3)
    sampled.append(post({"message": "今月の運勢は？", "threadId": stid, "sessionId": stid}))

    total = len(sampled)
    failsoft_count = sum(1 for x in sampled if bool_failsoft(x))
    empty_count = sum(1 for x in sampled if len(str(x.get("response", "")).strip()) == 0)
    main_count = sum(1 for x in sampled if not bool_failsoft(x) and len(str(x.get("response", "")).strip()) >= 80)
    route_dist = {}
    for x in sampled:
        rr = str(((x.get("decisionFrame") or {}).get("ku") or {}).get("routeReason") or "UNKNOWN")
        route_dist[rr] = route_dist.get(rr, 0) + 1

    result = {
        "since": SINCE,
        "log_counts": {
            "gemini_404": gemini_404,
            "gemini_429": gemini_429,
            "openai_quota": openai_quota,
        },
        "sample_metrics": {
            "total": total,
            "main_response_count": main_count,
            "main_response_rate": (main_count / total) if total else 0.0,
            "failsoft_count": failsoft_count,
            "failsoft_rate": (failsoft_count / total) if total else 0.0,
            "empty_count": empty_count,
            "route_reason_distribution": route_dist,
        },
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
PY
