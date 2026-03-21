# 08_FINAL_CURSOR_ACTION_PROMPT — 完成版 構築班用実装指示書

以下を**最初のカードから順に**実行する。1 カード = 1 目的。最小 diff。観測コマンド・patch 対象・verify 手順・FAIL 時の無効宣言/rollback・PASS 時の封印条件を満たすこと。

---

## カード 1: CARD_DB_REALITY_CHECK_AND_SEED_V1（最初の 1 枚）

**目的**: getDb("kokuzo") または実 runtime path が参照する DB 絶対パスを 1 回記録し、**実運用経路からその DB に write が発火した証拠**を採取したうえで、少なくとも 1 テーブルで COUNT ≥ 1 を確認する。

**acceptance**（「1件増えた」だけでなく「実運用経路からその DB に書かれた」まで含む）:
- getDb("kokuzo") または実 runtime path が参照している DB 絶対パスを 1 回記録する。
- その実 path に対して write が発火した証拠を採取する: **API call 時刻**、**write 関数通過ログ**、**COUNT before / after**。
- 指定テーブルで COUNT ≥ 1 であること。
- 既通過主権の probe が従来どおりであること。

**観測コマンド**:
```bash
# DB パス確認（api 実行環境で getDbPath("kokuzo") の戻り値をログまたはコードで確認）
sqlite3 <resolved_path> "SELECT COUNT(*) FROM thread_center_memory;"  # COUNT before
# API 1 回呼びまたは write 経路 1 回実行
sqlite3 <resolved_path> "SELECT COUNT(*) FROM thread_center_memory;"  # COUNT after
```

**patch 対象**: 原則として新規スクリプトまたは既存 seed のみ。アプリ本体は、実 path 記録と write 関数通過の一時ログのみ（必要なら）。

**verify 手順**:
1. getDb("kokuzo") が指す DB 絶対パスを 1 回記録する。
2. その実 path の当該テーブルで COUNT before を記録する。
3. 実運用経路（API 1 回または upsert/save 等の write 関数 1 回）を実行し、**API call 時刻**と**write 関数通過ログ**を採取する。
4. COUNT after を記録し、COUNT ≥ 1 であることを確認する。
5. 既通過主権の probe（使い方を教えて / 今後の方向性を1000字で。 / カタカムナとは何ですか / 言霊とは何ですか / 人生とは？ / ヒの言霊とは何ですか）を再実行し、従来どおりであることを確認する。

**FAIL 時の無効宣言 / rollback**: acceptance を満たさない場合は commit しない。一時ログは削除して rollback。

**PASS 時の封印条件**: 実 path 記録＋write 発火証拠（時刻・通過ログ・COUNT before/after）＋COUNT ≥ 1＋既通過主権不変を満たした場合のみ commit し、次カードへ進む。

---

## カード 2: CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1

**目的**: 一音言霊（ヒ/フ/ミの言霊等）の返答を、routeReason を KOTODAMA_ONE_SOUND_GROUNDED_V1 に 1 本化する。

**観測コマンド**:
```bash
curl -fsS -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
  --data '{"threadId":"one-1","message":"ヒの言霊とは何ですか"}' | jq '.decisionFrame.ku.routeReason'
curl -fsS -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
  --data '{"threadId":"one-2","message":"フの言霊とは何ですか"}' | jq '.decisionFrame.ku.routeReason'
curl -fsS -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" \
  --data '{"threadId":"one-3","message":"ミの言霊とは何ですか"}' | jq '.decisionFrame.ku.routeReason'
```

**patch 対象**: api/src/routes/chat.ts のみ。KOTODAMA_ONE_SOUND_GROUNDED_V2 / V4 のブロックで別の routeReason を返している場合は、同一 payload 生成（__buildKotodamaOneSoundPayloadV1）を呼び routeReason を V1 に統一するか、V2/V4 を削除し V1 の preempt のみに流す。

**verify 手順**: 上記 3 メッセージでいずれも `"KOTODAMA_ONE_SOUND_GROUNDED_V1"` が返ること。support / explicit / katakamuna / abstract の probe が従来どおりであること。

**FAIL 時の無効宣言 / rollback**: acceptance 未達なら当該変更を commit しない。変更を revert。

**PASS 時の封印条件**: 上記 acceptance を満たした場合のみ commit。

---

## カード 3 以降（要約）

- **CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1**: R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の返答を仕様確定または条件付き 1 文追加。対象: chat.ts。acceptance: 既通過主権不変、かつ essence/compare の仕様を満たすこと。
- **CARD_CANON_SURFACE_PENETRATION_V1**: 1 route で notionCanon または thoughtGuide の一句が response に含まれるようにする。対象: chat.ts または responseProjector / gates_impl。acceptance: 1 route で正典の一句が含まれること。
- **CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1**: route 一覧と優先順序を 1 ファイルにまとめ、コードのコメントまたは一覧と一致させる。対象: 主に doc。

いずれも「観測コマンド・patch 対象・verify 手順・FAIL 時の無効宣言/rollback・PASS 時の封印条件」を明示してから実施する。

**次の1枚**: [09_FINAL_DECISION.md](./09_FINAL_DECISION.md)
