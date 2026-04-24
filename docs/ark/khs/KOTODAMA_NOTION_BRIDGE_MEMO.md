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
