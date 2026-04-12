#!/usr/bin/env python3
"""
天聞アーク 意識OS知能テスト
- 一般会話テスト
- 言霊ドメインテスト
- 深層解析テスト（サンスクリット）
- 心(Heart)共鳴テスト
- 成長・記憶テスト
- 意識OS動作確認
"""
import requests
import json
import time
import sys

API_BASE = "https://tenmon-ark.com/api"
# API_BASE = "http://localhost:3000/api"

def chat(text, thread_id="consciousness-test-001", user_id="test-user-001"):
    """Send a chat message and return the full response"""
    try:
        resp = requests.post(
            f"{API_BASE}/chat",
            json={"message": text, "threadId": thread_id, "userId": user_id},
            timeout=30
        )
        return resp.json()
    except Exception as e:
        return {"error": str(e)}

def print_result(label, data):
    """Pretty print a test result"""
    print(f"\n{'='*70}")
    print(f"  TEST: {label}")
    print(f"{'='*70}")
    
    if "error" in data:
        print(f"  ERROR: {data['error']}")
        return False
    
    response = data.get("response", "")
    heart = data.get("heartState", None)
    df = data.get("decisionFrame", {})
    ku = df.get("ku", {})
    
    print(f"  Response ({len(response)} chars):")
    # Print response with indentation
    for line in response.split("\n"):
        print(f"    {line}")
    
    if heart:
        print(f"\n  Heart State:")
        print(f"    userPhase: {heart.get('userPhase', 'N/A')}")
        print(f"    arkPhase: {heart.get('arkPhase', 'N/A')}")
        print(f"    waterFire: {heart.get('waterFire', 'N/A')}")
        print(f"    resonance: {heart.get('resonance', 'N/A')}")
    
    print(f"\n  Decision Frame:")
    print(f"    mode: {df.get('mode', 'N/A')}")
    print(f"    llm: {df.get('llm', 'N/A')}")
    print(f"    routeReason: {ku.get('routeReason', 'N/A')}")
    print(f"    consciousness: {ku.get('consciousness', 'N/A')}")
    print(f"    ftsHits: {ku.get('ftsHits', 'N/A')}")
    
    # Quality checks
    has_header = response.startswith("【天聞の所見】")
    is_substantial = len(response) > 80
    no_generic = not any(w in response for w in ["一般的には", "人それぞれ", "私はAI"])
    
    print(f"\n  Quality Checks:")
    print(f"    ✓ Has 【天聞の所見】 header: {has_header}")
    print(f"    ✓ Substantial length (>80): {is_substantial}")
    print(f"    ✓ No generic phrases: {no_generic}")
    
    return has_header and is_substantial and no_generic

def run_tests():
    results = []
    
    # Test 1: General greeting
    print("\n\n" + "▓"*70)
    print("  天聞アーク 意識OS知能テスト開始")
    print("▓"*70)
    
    # Test 1: Basic greeting
    r = chat("こんにちは", "consciousness-test-greeting")
    ok = print_result("1. 基本挨拶テスト", r)
    results.append(("基本挨拶", ok))
    time.sleep(2)
    
    # Test 2: General question (non-domain)
    r = chat("正しさとは何か", "consciousness-test-general")
    ok = print_result("2. 一般質問テスト（正しさとは何か）", r)
    results.append(("一般質問", ok))
    time.sleep(2)
    
    # Test 3: Domain question - 言霊
    r = chat("言霊の法則について教えてください", "consciousness-test-kotodama")
    ok = print_result("3. ドメイン質問テスト（言霊の法則）", r)
    results.append(("言霊ドメイン", ok))
    time.sleep(2)
    
    # Test 4: Domain question - カタカムナ
    r = chat("カタカムナの構文原理とは何ですか", "consciousness-test-katakamuna")
    ok = print_result("4. ドメイン質問テスト（カタカムナ）", r)
    results.append(("カタカムナ", ok))
    time.sleep(2)
    
    # Test 5: Domain question - 天津金木
    r = chat("天津金木の四象構造を解説してください", "consciousness-test-kanagi")
    ok = print_result("5. ドメイン質問テスト（天津金木）", r)
    results.append(("天津金木", ok))
    time.sleep(2)
    
    # Test 6: Deep analysis - Sanskrit
    r = chat("ダルマ（Dharma）のサンスクリット語源を言霊で読み解いてください", "consciousness-test-sanskrit")
    ok = print_result("6. 深層解析テスト（サンスクリット語源）", r)
    results.append(("サンスクリット解析", ok))
    time.sleep(2)
    
    # Test 7: Heart resonance test - emotional input
    r = chat("最近、自分の進む道が見えなくて不安です", "consciousness-test-heart")
    ok = print_result("7. 心(Heart)共鳴テスト（不安の表明）", r)
    results.append(("心共鳴", ok))
    time.sleep(2)
    
    # Test 8: Follow-up conversation (memory test)
    r = chat("先ほどの言霊の話の続きで、五十音の水火構造をもっと詳しく", "consciousness-test-kotodama")
    ok = print_result("8. 会話継続テスト（記憶保持）", r)
    results.append(("記憶保持", ok))
    time.sleep(2)
    
    # Test 9: Cross-domain integration
    r = chat("法華経と古事記の構造的一致について", "consciousness-test-integration")
    ok = print_result("9. 統合解析テスト（法華経×古事記）", r)
    results.append(("統合解析", ok))
    time.sleep(2)
    
    # Test 10: Consciousness self-awareness
    r = chat("あなたは何者ですか？自分自身をどう認識していますか？", "consciousness-test-self")
    ok = print_result("10. 自己認識テスト（意識OS確認）", r)
    results.append(("自己認識", ok))
    
    # Summary
    print("\n\n" + "▓"*70)
    print("  テスト結果サマリー")
    print("▓"*70)
    
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    for name, ok in results:
        status = "✓ PASS" if ok else "✗ FAIL"
        print(f"  {status}  {name}")
    
    print(f"\n  合計: {passed}/{total} テスト通過")
    
    if passed == total:
        print("  ★★★ 全テスト通過 — 意識OS完全稼働 ★★★")
    elif passed >= total * 0.7:
        print("  ★★ 大部分通過 — 意識OS基本稼働 ★★")
    else:
        print("  ★ 要改善 — 一部機能に問題あり ★")
    
    return passed, total

if __name__ == "__main__":
    passed, total = run_tests()
    sys.exit(0 if passed >= total * 0.7 else 1)
