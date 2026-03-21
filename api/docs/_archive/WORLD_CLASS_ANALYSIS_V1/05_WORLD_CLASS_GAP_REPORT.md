# 05_WORLD_CLASS_GAP_REPORT — 世界最先端ギャップレポート

**根拠**: 確定観測・probe 結果・DB 0 件・chat.ts 実体。各層の「現状」は実測、「不足」は実体から推せる範囲のみ。

---

## 能力層の整理

| 能力層 | 現状 | 不足 | 実装候補 | 難易度 | 期待効果 |
|--------|------|------|----------|--------|----------|
| **grounding** | notionCanon, thoughtGuide, conceptCanon, scriptureCanon, kotodamaOneSound は接続。DB 0 のため KHS/ledger は空。 | 正典・ledger の実体が空。 | DB seed + write path 検証。CARD_DB_REALITY_CHECK_AND_SEED_V1。 | 中 | 返答の根拠が「実データ」になる。 |
| **continuity** | loadThreadCore / threadCenter はある。thread_center_memory 0 件。 | 前ターンの center が常に空。 | 上記 DB で thread_center に 1 件書く。saveThreadCore 発火確認。 | 中 | 要するに/比較の深掘りが可能になる。 |
| **abstraction** | 4 概念（人生/時間/命/真理）固定文。 | バリエーション・深さ。 | RESPONSE_FRAME_VARIATION_ENGINE_V2。 | 低〜中 | 抽象定義の幅が広がる。 |
| **style variation** | 固定文が多い。explicit は字数帯でテンプレ。 | 文体・着地の多様性。 | BEAUTIFUL_JAPANESE_SURFACE_ENGINE_V1。 | 中 | 単調さの解消。 |
| **self-compression** | binder が ku に載せる。ledger 0 件。 | 学習結果の圧縮が空。 | ledger に書く path の実装・検証。 | 中 | 過去問の要約が効く。 |
| **planning** | BOOK_PLACEHOLDER は入口のみ。 | 章構成・執筆計画の実行なし。 | BOOK_MODE_REAL_EXECUTION_V2。 | 高 | 長文執筆が実体化。 |
| **memory** | thread_center, synapse_log, book_continuation すべて 0。 | 実行時記憶が残っていない。 | DB write 発火 + seed。 | 中 | 会話の一貫性。 |
| **evidence** | 固定文では evidence を返さない。LLM 経路は別。 | 根拠付き返答が少ない。 | canon 参照結果を response に埋める。 | 中 | 信頼性の向上。 |
| **route sovereignty** | 一音 V1/V2/V4 共存。DEF_LLM_TOP 等残存。 | 一音の一本化。 | CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1。CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1。 | 低 | 挙動の予測可能性。 |
| **authoring** | BOOK_PLACEHOLDER のみ。 | 本文生成なし。 | 上記 BOOK_MODE。 | 高 | 書籍モードの実現。 |
| **book mode** | 入口 + upsertBookContinuation。本文なし。 | 章・続きの生成。 | CARD_BOOK_MODE_REAL_EXECUTION_V2（または段階的カード）。 | 高 | 長文コンテンツ。 |
| **introspection** | なし。 | 自己説明・デバッグ情報の露出。 | オプション。 | 低 | 運用・解析。 |

---

## 優先度（実測に基づく）

1. **P0**: DB 実体の確認と 1 件 seed（CARD_DB_REALITY_CHECK_AND_SEED_V1）。他がすべてこれに依存。
2. **P1**: 一音 route 統一（CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1）。主権の一貫性。
3. **P2**: follow-up の深さ（R22_ESSENCE_ASK / R22_COMPARE_ASK の仕様決定 or CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1）。DB が効けば「前の center」を参照できる。
4. **P3**: canon の表面貫通（CARD_CANON_SURFACE_PENETRATION_V1）。正典の一文を response に含める等。
5. **P4 以降**: 抽象バリエーション、文体、book 本文生成。

---

**次の1枚**: [06_REARCHITECT_PLAN.md](./06_REARCHITECT_PLAN.md)
