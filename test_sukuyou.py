#!/usr/bin/env python3
"""
天聞アーク 宿曜経×天津金木×言霊 統合診断 知能テスト
"""
import requests
import json
import time

BASE = "https://tenmon-ark.com"

def sep(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def test_api(method, path, data=None, label=""):
    url = f"{BASE}{path}"
    print(f"\n--- {label} ---")
    print(f"  {method} {url}")
    if data:
        print(f"  Body: {json.dumps(data, ensure_ascii=False)[:200]}")
    try:
        if method == "GET":
            r = requests.get(url, timeout=30)
        else:
            r = requests.post(url, json=data, timeout=30)
        print(f"  Status: {r.status_code}")
        j = r.json()
        return j
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def test_chat(message, label="", thread_id=None):
    url = f"{BASE}/api/chat"
    data = {"message": message}
    if thread_id:
        data["threadId"] = thread_id
    print(f"\n--- {label} ---")
    print(f"  Message: {message}")
    try:
        r = requests.post(url, json=data, timeout=30)
        j = r.json()
        resp = j.get("response", "")[:500]
        print(f"  Status: {r.status_code}")
        print(f"  Response ({len(resp)}c): {resp}")
        return j
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

# ============================================
# Phase 1: API直接テスト
# ============================================
sep("Phase 1: 宿曜診断API直接テスト")

# Test 1: 今日の運勢
r1 = test_api("GET", "/api/sukuyou/daily", label="1. 今日の運勢")
if r1 and r1.get("success"):
    d = r1.get("daily", {})
    print(f"  ✅ 直宿: {d.get('nakshatra')}宿")
    print(f"  ✅ 直曜: {d.get('planet')}曜")
    print(f"  ✅ 十二直: {d.get('juniChoku')}")
    print(f"  ✅ 遊年八卦: {d.get('yunenHakke', {}).get('trigram')}")
    print(f"  ✅ 三層位相: {d.get('threeLayer', {})}")
else:
    print(f"  ❌ FAIL")

# Test 2: 個人診断（1990年1月15日生まれ）
r2 = test_api("POST", "/api/sukuyou/diagnose", 
    data={"birthDate": "1990-01-15", "name": "タケシ"},
    label="2. 個人診断（1990-01-15 タケシ）")
if r2 and r2.get("success"):
    d = r2.get("diagnosis", {})
    print(f"  ✅ 命宿: {d.get('honmeiShuku')}宿")
    print(f"  ✅ 命曜: {d.get('honmeiYo')}曜")
    print(f"  ✅ 九星: {d.get('kyusei')}")
    print(f"  ✅ 命宮: {d.get('meikyu')}")
    print(f"  ✅ 躰/用: {d.get('taiYou', {}).get('judgment')}")
    print(f"  ✅ 火スコア: {d.get('taiYou', {}).get('fireScore')}")
    print(f"  ✅ 水スコア: {d.get('taiYou', {}).get('waterScore')}")
    if d.get("nameAnalysis"):
        na = d["nameAnalysis"]
        print(f"  ✅ 名前解析: バランス={na.get('balance')}, 火={na.get('fireCount')}, 水={na.get('waterCount')}")
    interp = d.get("fullInterpretation", "")
    print(f"  ✅ 解釈テキスト ({len(interp)}c): {interp[:200]}...")
else:
    print(f"  ❌ FAIL: {r2}")

# Test 3: 別の日付（1985年8月23日）
r3 = test_api("POST", "/api/sukuyou/diagnose",
    data={"birthDate": "1985-08-23"},
    label="3. 個人診断（1985-08-23 名前なし）")
if r3 and r3.get("success"):
    d = r3.get("diagnosis", {})
    print(f"  ✅ 命宿: {d.get('honmeiShuku')}宿")
    print(f"  ✅ 命曜: {d.get('honmeiYo')}曜")
    print(f"  ✅ 命宮: {d.get('meikyu')}")
    print(f"  ✅ 日運: 直宿={d.get('daily', {}).get('nakshatra')}宿, 関係={d.get('daily', {}).get('relation')}")
else:
    print(f"  ❌ FAIL")

# Test 4: 相性診断
r4 = test_api("POST", "/api/sukuyou/compatibility",
    data={
        "personA": {"birthDate": "1990-01-15", "name": "タケシ"},
        "personB": {"birthDate": "1992-06-20", "name": "ハナコ"}
    },
    label="4. 相性診断（タケシ × ハナコ）")
if r4 and r4.get("success"):
    c = r4.get("compatibility", {})
    print(f"  ✅ A命宿: {c.get('personA', {}).get('honmeiShuku')}宿")
    print(f"  ✅ B命宿: {c.get('personB', {}).get('honmeiShuku')}宿")
    print(f"  ✅ 三九法: A→B={c.get('sanku', {}).get('relAtoB')}, B→A={c.get('sanku', {}).get('relBtoA')}")
    print(f"  ✅ 総合スコア: {c.get('totalScore')}")
    print(f"  ✅ 総合評価: {c.get('totalGrade')}")
    print(f"  ✅ 解釈: {c.get('interpretation', '')[:200]}")
else:
    print(f"  ❌ FAIL: {r4}")

# Test 5: 二十七宿一覧
r5 = test_api("GET", "/api/sukuyou/nakshatras", label="5. 二十七宿一覧")
if r5 and r5.get("success"):
    naks = r5.get("nakshatras", [])
    print(f"  ✅ 宿数: {len(naks)}")
    if naks:
        first = naks[0]
        print(f"  ✅ 第1宿: {first.get('name')}（{first.get('reading')}・{first.get('sanskrit')}）")
else:
    print(f"  ❌ FAIL")

# ============================================
# Phase 2: チャット統合テスト（宿曜関連質問）
# ============================================
sep("Phase 2: チャット統合テスト（宿曜関連質問）")

time.sleep(2)

# Test 6: 宿曜の基本質問
test_chat("宿曜経とは何ですか？天津金木との関係を教えてください", 
    label="6. 宿曜経の基本質問", thread_id="sukuyou-test-1")

time.sleep(3)

# Test 7: 生年月日付きの鑑定依頼
test_chat("1990年1月15日生まれです。私の命宿と今日の運勢を鑑定してください", 
    label="7. 生年月日付き鑑定（チャット経由）", thread_id="sukuyou-test-2")

time.sleep(3)

# Test 8: 三九法の解説
test_chat("三九法とは何ですか？命宿同士の関係性はどのように決まりますか", 
    label="8. 三九法の解説", thread_id="sukuyou-test-3")

time.sleep(3)

# Test 9: 相性に関する質問
test_chat("角宿と房宿の相性を教えてください。三九法ではどのような関係になりますか", 
    label="9. 宿同士の相性質問", thread_id="sukuyou-test-4")

time.sleep(3)

# Test 10: 密教占星法の深い質問
test_chat("密教占星法における十二宮と七曜の関係を天津金木の水火の法則で解読してください", 
    label="10. 密教占星法の深層質問", thread_id="sukuyou-test-5")

# ============================================
# Summary
# ============================================
sep("テスト完了サマリー")
print("""
Phase 1 (API直接テスト):
  1. 今日の運勢 — 直宿・直曜・十二直・遊年八卦・三層位相
  2. 個人診断 — 命宿・命曜・九星・命宮・躰用・言霊解析
  3. 個人診断（名前なし） — 命宿・命曜・日運
  4. 相性診断 — 三九法・水火バランス・総合スコア
  5. 二十七宿一覧 — 全27宿データ

Phase 2 (チャット統合テスト):
  6. 宿曜経の基本質問
  7. 生年月日付き鑑定（チャット経由自動抽出）
  8. 三九法の解説
  9. 宿同士の相性質問
  10. 密教占星法の深層質問
""")
