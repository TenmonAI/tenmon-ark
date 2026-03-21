# 07_FINAL_REARCHITECT_PLAN — 完成版 改訂ロードマップ

**根拠**: 00–06 の裁定。既通過主権を壊さず、世界最先端級への最短順。憶測禁止。

---

## P0: 主権統合（次の1枚）

| cardId | 目的 | 対象ファイル | acceptance | リスク | 先行条件 | 封印条件 |
|--------|------|--------------|------------|--------|----------|----------|
| CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1 | 一音言霊を KOTODAMA_ONE_SOUND_GROUNDED_V1 に 1 本化。ヒ/フ/ミ/ハ/ヘ/ムが generic 落ちしない。 | chat.ts, 必要なら kotodamaOneSoundLawIndex.ts | ヒ/フ/ミ（およびハ・ヘ・ム）の probe で routeReason がすべて KOTODAMA_ONE_SOUND_GROUNDED_V1。support/explicit/katakamuna/abstract 非破壊。 | 一音の一部で regression。 | なし。 | acceptance 未達。 |

---

## P1: DB 実体

| cardId | 目的 | 対象ファイル | acceptance | リスク | 先行条件 | 封印条件 |
|--------|------|--------------|------------|--------|----------|----------|
| CARD_DB_REALITY_CHECK_AND_SEED_V1 | 実行時 DB パス特定、7 テーブル存在確認、**実運用経路からその DB に write 発火**の証拠採取（API call 時刻・write 通過ログ・COUNT before/after）、COUNT ≥ 1。 | api/src/db、seed または既存 API 経路 | 実 path 記録＋write 発火証拠（時刻・通過ログ・COUNT before/after）＋COUNT ≥ 1＋既通過主権 probe 不変。 | 接続先誤りで本番 DB を触る。 | なし。 | acceptance 未達。 |

---

## P2: follow-up 知能

| cardId | 目的 | 対象ファイル | acceptance | リスク | 先行条件 | 封印条件 |
|--------|------|--------------|------------|--------|----------|----------|
| CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1 | R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の返答を仕様確定または条件付き 1 文追加。ask 止まり卒業。 | chat.ts | threadCenter あり時は従来 or 拡張短文。なし時は現状維持 or 1 文追加。既通過主権不変。 | 深くしすぎて LLM 必須にしない。 | なし。 | acceptance 未達。 |

---

## P3: 正典の表面貫通

| cardId | 目的 | 対象ファイル | acceptance | リスク | 先行条件 | 封印条件 |
|--------|------|--------------|------------|--------|----------|----------|
| CARD_CANON_SURFACE_PENETRATION_V1 | notionCanon / thoughtGuide の一句を response に含める経路を 1 つ追加。 | chat.ts または responseProjector / gates_impl | 1 route で正典の一句が response に含まれる。既通過主権不変。 | 長文化・重複。 | なし。 | acceptance 未達。 |

---

## P4: route 主権整理・general 縮退

| cardId | 目的 | 対象ファイル | acceptance | リスク | 先行条件 | 封印条件 |
|--------|------|--------------|------------|--------|----------|----------|
| CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1 | 主権 route 一覧・優先順序を 1 ファイルに文書化。コードのコメントまたは一覧と一致。 | 主に doc。必要なら chat.ts の分岐順のみ。 | 既通過主権不変。route 一覧が doc と一致。 | 順序変更で意図しない fallback。 | なし。 | acceptance 未達。 |
| CARD_GENERAL_INTELLIGENCE_SHRINK_V1 | DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP の縮退または天聞化。 | chat.ts, tenmonBrainstem.ts, gates_impl.ts | general が天聞化する。既通過主権不変。 | generic 化の増加。 | なし。 | acceptance 未達。 |

---

## P5: 書籍モード

| cardId | 目的 | 対象ファイル | acceptance | リスク | 先行条件 | 封印条件 |
|--------|------|--------------|------------|--------|----------|----------|
| CARD_BOOK_MODE_EXECUTION_V1 | 章・続きの本文生成を 1 パターンで実装。 | chat.ts, bookContinuationMemory, 必要なら新モジュール | 「続きを書いて」で 1 回、前回要約に基づく本文が返る。 | 長文品質。 | DB reality の一定程度の解消。 | acceptance 未達。 |

---

## P6–P8

| フェーズ | cardId（例） | 目的 | 先行条件 |
|----------|--------------|------|----------|
| P6 | CARD_CONTINUITY_MEMORY_REALIZATION_V1 | 3 ターン continuity PASS。thread_center の読み書きが実体で動く。 | DB reality。 |
| P7 | CARD_EXPRESSION_WORLDCLASS_LAYER_V1 | 世界最先端級の表現レイヤ。一般会話で深さと変化幅。 | なし。 |
| P8 | 監査・メトリクス定期レポート（スクリプト） | 運用の観測可能性。 | なし。 |

各カードは目的・対象・acceptance・リスク・先行条件・封印条件を明示してから着手する。

**次の1枚**: [08_FINAL_CURSOR_ACTION_PROMPT.md](./08_FINAL_CURSOR_ACTION_PROMPT.md)
