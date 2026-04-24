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
- MC-20-CONSTITUTION-ENFORCER-V1: 憲法違反監視機能
- 後続: Phase B（TENMON 再裁定後）
