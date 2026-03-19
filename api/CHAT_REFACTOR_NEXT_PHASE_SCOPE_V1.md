# CHAT_REFACTOR_NEXT_PHASE_SCOPE_V1

- **baseline:** 2be7fc6
- **branch:** 2026-03-04-e5hp

## 1. 次フェーズ対象（4束）

### A. longform quality

- 長文応答の一貫性・情報密度・読みやすさの最適化
- routeReason / contract を維持したまま品質改善を行う

### B. beauty / wording / cadence

- 語感・文体・リズムの調整
- 可読性と印象品質を高める表現改善

### C. canon synthesis

- canon 接続の統合品質を改善
- scripture / concept / notion の整合を強化

### D. thought projection / comfort

- thought projection の自然性と快適性を改善
- 対話継続時の安心感・負荷バランスを最適化

## 2. 実装順（固定）

1. longform
2. beauty
3. canon synthesis
4. projection / comfort

## 3. non-negotiables

- `routeReason` を壊さない
- PATCH29 acceptance を壊さない
- no-touch: `api/src/db/kokuzo_schema.sql`
- docs-only 文書は必要に応じて個別 commit 可（コード変更と混同しない）

## 4. 次カード候補（1つ）

- CHAT_SAFE_REFACTOR_PATCH69_LONGFORM_SCOPE_LOCK_V1
