# TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1

## 目的

人生相談ルート（`KANAGI_CONVERSATION_V1` 等）において、**いろは言霊解を mapping 層**として扱い、KHS root の法則裁定と衝突させず、**生死循環・神仏両道・安心立命**の軸を **digest / law 昇格なしのメタ kernel** として束ねる。  
会話本文の捏造はせず、`thoughtCoreSummary` に **裁定可能な軸**だけを載せる。

## D

- 最小 diff
- 1 変更 = 1 検証
- fail-closed
- broad rewrite 禁止
- **KHS を唯一の root law source**（いろはは mapping）
- `routeReason` / `decisionFrame` / `thoughtCoreSummary` 契約維持
- `decisionFrame.llm` 契約を壊さない
- `decisionFrame.ku` は object のまま
- `api/src/routes/chat.ts` 広域改修禁止
- `api/src/routes/chat_refactor/finalize.ts` 大改修禁止
- `web/src/**` 原則触らない
- `dist/**` 直編集禁止
- generic spiritual drift 禁止
- 外部ニューエイジ的補間禁止
- build / audit / probe PASS 以外 rollback
- PASS 以外 seal / commit 禁止

## Root / Mapping

- **Root:** 言霊秘書（KHS）— 既存 `khsRootFractalConstitutionV1` / fractal law 系
- **Mapping:** いろは言霊解（本カードの kernel 対象）
- **Comparative:** 必要ならサンスクリット・法華は別層（上書き禁止）

## 対象ファイル

### 新規（推奨）

- `api/src/core/tenmonIrohaLifeCounselingKernelV1.ts`

### 編集可（最小）

- `api/src/core/knowledgeBinder.ts`（`thoughtCoreSummary` に 1 ブロック追加のみ）
- 必要なら `api/src/core/tenmonKnowledgeStyleBridgeV1.ts`（人生相談 family の hint 優先度のみ）

### 観測のみ

- `api/src/routes/chat.ts`
- `api/src/core/responseComposer.ts`

### 編集禁止

- `web/src/**`
- `dist/**`

## 新規モジュール契約（`tenmonIrohaLifeCounselingKernelV1.ts`）

出力（例）:

- `card`: `"TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1"`
- `irohaCounselingAxis`: 短文（mapping 層の軸名）
- `irohaCounselingCenter`: root と混同しない一文
- `irohaCounselingTension`: `string | null`（対立・未決の観測）
- `irohaCounselingBridgeHint`: finalize / style bridge 用の短 hint（本文捏造なし）

最低キーワード観測（メッセージから fail-closed）:

- いろは / 生死 / 循環 / 仏道 / 安心立命（過剰断定禁止）

`resolveIrohaLifeCounselingKernelV1(message: string, routeReason: string)`  
- `routeReason` が KANAGI 系でない、またはメッセージが人生相談に該当しない場合は **null**（fail-closed）。

## knowledgeBinder 統合

- `thoughtCoreSummaryPatch` に `irohaLifeCounselingKernelV1: <bundle | null>` を追加
- 既存キー上書き禁止（merge のみ）

## acceptance

1. `KANAGI_CONVERSATION_V1` かつ人生相談文で kernel が **非 null**
2. `SCRIPTURE_LOCAL_RESOLVER_V4` では kernel が **触らない**（null または未付与）
3. build / `npm run check` PASS
4. `thoughtCoreSummary` に `routeReason` が残る

## PASS / FAIL

**PASS:** 上記 + kernel が mapping として root と混同しないコメント付き  
**FAIL:** root 上書き、長文捏造、chat 広域改修、build failure

## 出力（automation JSON）

```json
{
  "ok": true,
  "card": "TENMON_IROHA_LIFE_COUNSELING_KERNEL_CURSOR_AUTO_V1",
  "iroha_life_counseling_kernel_ready": true,
  "khs_root_preserved": true,
  "mapping_layer_only": true,
  "rollback_used": false,
  "next_card_if_fail": "TENMON_IROHA_LIFE_COUNSELING_KERNEL_TRACE_CURSOR_AUTO_V1"
}
```
