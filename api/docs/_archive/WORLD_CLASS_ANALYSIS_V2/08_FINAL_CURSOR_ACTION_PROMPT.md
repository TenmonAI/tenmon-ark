# 08_FINAL_CURSOR_ACTION_PROMPT — 完成版 構築班用実装指示書

以下を**最初のカードから順に**実行する。1 カード = 1 目的。最小 diff。観測コマンド・patch 対象・verify 手順・FAIL 時の無効宣言/rollback・PASS 時の封印条件を満たすこと。

---

## カード 1: CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1（次の1枚）

**目的**: 一音言霊（ヒ/フ/ミ/ハ/ヘ/ムの言霊）の返答を、routeReason を KOTODAMA_ONE_SOUND_GROUNDED_V1 に 1 本化する。フ・ミが DEF_FASTPATH_VERIFIED_V1 に落ちることを解消する。

**観測コマンド**:
```bash
# 統合前の状態確認（必要なら）
curl -fsS -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
  --data '{"threadId":"one-1","message":"ヒの言霊とは何ですか"}' | jq '.decisionFrame.ku.routeReason'
curl -fsS -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
  --data '{"threadId":"one-2","message":"フの言霊とは何ですか"}' | jq '.decisionFrame.ku.routeReason'
curl -fsS -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
  --data '{"threadId":"one-3","message":"ミの言霊とは何ですか"}' | jq '.decisionFrame.ku.routeReason'
```

**patch 対象**: api/src/routes/chat.ts のみ。KOTODAMA_ONE_SOUND_GROUNDED_V2 / V4 のブロックおよび一音で DEF_FASTPATH_VERIFIED_V1 に落ちる経路を、同一の一音 payload 生成（例: __buildKotodamaOneSoundPayloadV1）を呼び routeReason を KOTODAMA_ONE_SOUND_GROUNDED_V1 に統一する。または V2/V4 を削除し、一音判定を 1 箇所に集約して V1 のみ返す。

**verify 手順**:
1. 上記 3 メッセージ（ヒ/フ/ミの言霊とは何ですか）でいずれも `"KOTODAMA_ONE_SOUND_GROUNDED_V1"` が返ること。
2. 既通過主権の probe が従来どおりであること: 使い方を教えて → SUPPORT_PRODUCT_USAGE_V1、今後の方向性を1000字で。→ EXPLICIT_CHAR_PREEMPT_V1、カタカムナとは何ですか → KATAKAMUNA_CANON_ROUTE_V1、人生とは？→ ABSTRACT_FRAME_VARIATION_V1、言霊とは何ですか → DEF_FASTPATH_VERIFIED_V1。

**FAIL 時の無効宣言 / rollback**: acceptance を満たさない場合は当該変更を commit しない（無効宣言）。変更を revert。

**PASS 時の封印条件**: 上記 acceptance を満たした場合のみ commit。次に CARD_DB_REALITY_CHECK_AND_SEED_V1 または CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1 に進む。

---

## カード 2: CARD_DB_REALITY_CHECK_AND_SEED_V1

**目的**: getDb("kokuzo") または実 runtime path が参照する DB 絶対パスを特定し、**実運用経路からその DB に write が発火した証拠**を採取したうえで、少なくとも 1 テーブルで COUNT ≥ 1 を確認する。

**acceptance**（「1件増えた」だけでなく「実運用経路からその DB に書かれた」まで含む）:
- getDb("kokuzo") または実 runtime path が参照している DB 絶対パスを 1 回記録する。
- その実 path に対して write が発火した証拠を採取する: **API call 時刻**、**write 関数通過ログ**、**COUNT before / after**。
- 指定テーブルで COUNT ≥ 1 であること。
- 既通過主権 probe 不変であること。

**観測コマンド**:
```bash
# 実行時 DB パスはコードまたは一時ログで確認
sqlite3 <resolved_path> ".tables"
sqlite3 <resolved_path> "SELECT COUNT(*) FROM thread_center_memory;"  # COUNT before
# API 1 回呼びまたは write 経路 1 回実行
sqlite3 <resolved_path> "SELECT COUNT(*) FROM thread_center_memory;"  # COUNT after
```

**patch 対象**: 原則として新規スクリプトまたは既存 seed。アプリ本体は getDbPath("kokuzo") の 1 回記録ログと、write 関数通過の 1 回ログまで（必要なら）。

**verify 手順**: (1) 実行時 DB 絶対パスを 1 回記録。(2) その DB に 7 テーブルが存在するか確認。無ければ kokuzo_schema.sql を適用。(3) 当該テーブルの COUNT before を記録。(4) 実運用経路（API 1 回または upsert/save 等の write 関数 1 回）を実行し、**API call 時刻**と**write 関数通過ログ**を採取。(5) COUNT after を記録し COUNT ≥ 1 を確認。(6) 既通過主権の probe が従来どおり。

**FAIL 時の無効宣言 / rollback**: acceptance 未達なら commit しない。一時ログは削除して rollback。

**PASS 時の封印条件**: 実 path 記録＋write 発火証拠（時刻・通過ログ・COUNT before/after）＋COUNT ≥ 1＋既通過主権不変を満たした場合のみ commit。

---

## カード 3 以降（要約）

- **CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1**: R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の返答を仕様確定または条件付き 1 文追加。対象: chat.ts。acceptance: 既通過主権不変、essence/compare の仕様を満たすこと。
- **CARD_CANON_SURFACE_PENETRATION_V1**: 1 route で notionCanon または thoughtGuide の一句が response に含まれるようにする。対象: chat.ts または responseProjector / gates_impl。
- **CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1**: route 一覧と優先順序を 1 ファイルにまとめ、コードと一致させる。対象: 主に doc。

いずれも観測コマンド・patch 対象・verify 手順・FAIL 時の無効宣言/rollback・PASS 時の封印条件を明示してから実施する。

**次の1枚**: [09_FINAL_DECISION.md](./09_FINAL_DECISION.md)
