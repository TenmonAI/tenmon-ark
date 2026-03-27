# TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1

## 目的

`tenmonIrohaLifeCounselingKernelV1` と `tenmonDanshariLifeOrderKernelV1` の **両 bundle** を、人生相談系 route で **衝突なく 1 つの bridge メタ**に束ね、`tenmonKnowledgeStyleBridgeV1` が参照する **center / next の補助**にだけ使う。  
本文生成は行わない。root=KHS を上書きしない。

## D

- 最小 diff
- fail-closed
- broad rewrite 禁止
- **いろは（mapping）と断捨離（秩序補助）を同一視しない**
- `thoughtCoreSummary` 契約維持
- `chat.ts` / `finalize` 広域改修禁止
- `web/src/**` 禁止
- 2 kernel のどちらかが null でも bridge は **観測モード**でよい（捏造禁止）

## 前提

- 先行カードで以下が存在すること:
  - `tenmonIrohaLifeCounselingKernelV1.ts`
  - `tenmonDanshariLifeOrderKernelV1.ts`

## 対象ファイル

### 新規（推奨）

- `api/src/core/tenmonIrohaDanshariCounselingBridgeV1.ts`

### 編集可（最小）

- `api/src/core/knowledgeBinder.ts`（bridge bundle を 1 キーで付与）
- `api/src/core/tenmonKnowledgeStyleBridgeV1.ts`（`KANAGI_*` のみ、bridge からの **短い補助 hint** を読む分岐を **数行**）

### 編集禁止

- `responseComposer.ts`（本カードでは原則観測）

## Bridge 出力契約

- `card`: `"TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1"`
- `bridgeReady`: boolean（両方 null なら false）
- `irohaLayerSummary`: string（mapping 要約 1 行）
- `danshariLayerSummary`: string（秩序補助 1 行）
- `combinedHintForSurface`: string（240 字以内、meta ラベルは本文に出さない方針で strip 済みを想定）
- `rootVsMappingBoundary`: 固定文 `"KHS_root; iroha=mapping; danshari=auxiliary_order"`

`buildIrohaDanshariCounselingBridgeV1(iroha: ..., danshari: ...)` — 引数 null 可。

## acceptance

1. KANAGI + 人生文で `bridgeReady === true` になり得る
2. 法華プローブでは bridge が **本文を汚染しない**（未適用または null）
3. build PASS

## 出力（automation JSON）

```json
{
  "ok": true,
  "card": "TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1",
  "counseling_bridge_ready": true,
  "root_mapping_separated": true,
  "rollback_used": false,
  "next_card_if_fail": "TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_TRACE_CURSOR_AUTO_V1"
}
```
