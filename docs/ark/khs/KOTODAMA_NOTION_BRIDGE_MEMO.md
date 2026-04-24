# KOTODAMA_CONSTITUTION_V1 — Notion 受け皿ブリッジ MEMO

- **KOTODAMA_CONSTITUTION_V1** 成立: **2026-04-24**（`docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt`）
- **Notion 受け皿**: 「🧩 天聞アーク｜未完了部品 全回収マスター設計書」へ本 MEMO の要点を転記すること。

## 後続カード（MC-20-C 以降）項目リスト

- **C**: `deepIntelligenceMapV1` の分母を 50 固定、`with_*` 分離
- **D**: `canonical_kotodama_base` スキーマ設計
- **E**: Notion 言灵秘書データベース → `canonical_kotodama_base` 同期
- **F**: `with_entry` を 50 分の x で再算出
- **G**: `kotodamaOneSoundLawIndex` を `canonical_base` 参照者化
- **H**: hisho / iroha / genten / unified 4 loader を canonical 従属化
- **I**: UI 簡略表と canonical DB の分離明示

---

## 2026-04-24: MC-20-BRIDGE-PIPELINE-V1 実装ログ

### 実装内容

- `api/src/core/kotodamaBridgeRegistry.ts` 新設
- 2 つの Page ID を静的レジストリに固定
  - 橋渡し: `33d65146-58e6-8187-b8dd-d7638fdddaa5`
  - 分離メモ: `33d65146-58e6-8124-85f9-fab4c366cc5a`
- `deepIntelligenceMapV1` に `kotodama_bridges` セクション追加
- `constitutionLoader` で起動時ログ出力（`KOTODAMA_CONSTITUTION_V1` 封印 VERIFIED 直後）

### 効果

- `rg` 検索でヒット 0 件 → **`api/src` に UUID 文字列が出現**（runtime 露出）
- `GET /api/mc/vnext/intelligence` で `kotodama_bridges` が可視化
- 起動ログに `[KOTODAMA_BRIDGE] registry loaded ...` 出現

### 次カード

- MC-20-DEEP-MAP-DENOM-FIX-V1: 50 分母・ヰヱ保持・ン除外（憲法違反是正）

---

## 2026-04-24: MC-20-DEEP-MAP-DENOM-FIX-V1 実装ログ

### 実装内容

- `kotodama50MapV1.ts` に `GOJUREN_JUGYO_V1` / `GOJUREN_50_SOUNDS_V1` 追加
- 五十連十行構造 (10 行 × 5 段 = 50 音) で定義
- ヰ・ヱ 保持（ア行イ vs ヤ行ヰ vs ワ行ヰ を別 `canonical_id`）
- 「ン」除外
- coverage 計算を 50 分母固定、`with_*` 6 種分離
- 旧 `GOJUON_BASE` は `@deprecated`（次カードで削除）
- `deepIntelligenceMapV1` ルートに `kotodama_50_coverage` 詳細オブジェクト追加（`summary.kotodama_50_coverage` は比率の数のまま）

### 憲法整合

- 第 2 条: total = 50
- 第 3 条: ン除外
- 第 4 条: ヰ・ヱ 保持
- 第 8 条: `with_*` 分離

### 効果

- `GET /api/mc/vnext/intelligence` の `kotodama_50_coverage` が正典基準で算出
- 「46 で 100%」偽陽性の再発防止
- MC-20-CONSTITUTION-ENFORCER-V1: 憲法違反監視機能
- 後続: Phase B（TENMON 再裁定後）

### 追補（カード改訂版）

- `buildKotodama50MapV1`: `kotodama_meanings`・`EVIDENCE_UNITS_KHS_v1.jsonl`・列ラベル「未確定」に基づく `with_*` 6 種
- 起動時 `[KOTODAMA_CONSTITUTION_V1_VIOLATION]` assert（50 音・ン除外・ヰヱ≥2）
- `GOJUON_BASE` を **`export const`** + 拡張 `@deprecated` JSDoc

---

## 2026-04-24: MC-20-PROMPT-TRACE-V1 実装ログ

### 実装内容

- `intelligenceFireTracker.ts` に `PromptTraceV1` / `PromptTraceClauseLengthsV1` / `PromptTraceSummary24hV1` 追加
- `appendIntelligenceFireEventV1(flags, promptTrace?)` — `prompt_trace` を jsonl に任意追記（後方互換）
- `chat.ts`（NATURAL_GENERAL 本線）で各 soul-root clause 長・`prompt_total_length`・`route_reason`・`provider`・応答長を計測し、応答確定後に 1 行追記
- `summarizeIntelligenceFire24hV1()` の戻りに `prompt_trace_summary_24h` を追加（`/api/mc/vnext/intelligence/fire` 経由で可視）

### 効果

- Clause 別の実注入長が runtime / jsonl から参照可能
- `route_reason` / `provider` がイベント単位で記録される
- prompt 総長・response 長・user message 長の相関が 24h 集計で把握可能

### 観測計装原則

- prompt 本文・ルート分岐ロジックは変更していない（計測・追記のみ）
- 既存 jsonl は boolean 行と共存（`prompt_trace` は optional）
- 計測は `.length` のみで O(1)

### 次カード

- MC-20-CONSTITUTION-ENFORCER-V1: 計測基盤の上で憲法違反を監視

---

## 2026-04-24: MC-20-CONSTITUTION-ENFORCER-V1 実装ログ

### 実装内容

- `kotodamaConstitutionEnforcerV1.ts` 新設
- 憲法 V1 第 2, 3, 4, 6, 8, 9 条の runtime 監視
- ERROR (第 2, 3, 4, 8) / WARN (第 6, 9) 分離
- 起動時 console 出力
- `/api/mc/vnext/intelligence` に `kotodama_constitution_enforcer` セクション

### 原則

- 検知と警告のみ、自動修正なし
- 既存 chat / acceptance に影響なし
- 本モジュール配線により、憲法は文書権威から実効権威へ昇格

### Phase A 完了

本カード SEAL により、Phase A (基礎回路構築) 全 6 枚完成:

1. MC-20-B KOTODAMA-CONSTITUTION-V1 (5c1144ca) 文書権威
2. MC-20-BRIDGE-PIPELINE-V1 (e6e8cebf) 正規経路
3. MC-20-DEEP-MAP-DENOM-FIX-V1 (f18a8a6c) 正規分母
4. MC-20-CHAT-LENGTH-REGRESSION-AUDIT-V1 (d9aec8ff) 切り分け監査
5. MC-20-PROMPT-TRACE-V1 (fc78185c) 計測基盤
6. MC-20-CONSTITUTION-ENFORCER-V1 (本カード) 実効権威

次段階: TENMON 再裁定 → Phase B 検討 (canonical_kotodama_base 拡張 / Notion 同期 / loader 従属化)
