# TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1

## 目的

天聞カタカムナを **historical fact** でも **普及本流の一括** でもなく、**天聞再統合の写像層（`tenmon_reintegration_lane`）** として束ねる。`root` / `mapping` / `reintegration` / `speculative` を混線させない。

## 4 lane

| lane | 役割 |
|------|------|
| `root_lane` | 言霊秘書・水穂伝・稲荷古伝を候補 root（カタカムナは root にしない） |
| `mapping_lane` | カタカムナを写像・対照の **mapping 先** として扱う |
| `tenmon_reintegration_lane` | 天聞応答での境界整理・再統合の語り口 |
| `speculative_lane` | 類比・重ね読み等の表層（本文ヒット時に `lanes_resolved` に追加） |

## 実装接続

- `api/src/core/tenmonKatakamunaReintegrationBindV1.ts` … バインド本体・文脈検出・`response_constraints`。
- `api/src/core/structuralCompatibilityAndRootSeparation.ts` … `mergeStructuralCompatibilityWithKatakamunaReintegrationV1` で ku の struct に非破壊マージ。
- `api/src/core/knowledgeBinder.ts` … truth kernel へ渡す `structuralCompatibilityAndRootSeparationV1` にマージ結果を載せる。
- `api/src/core/misreadExpansionAndSpeculativeGuard.ts` … カタカムナ文脈で史実口調・断定を強化抑止（`shouldTenmonKatakamunaReintegrationTightenHistoricalGuardV1`）。

## 成果物

- `api/automation/tenmon_katakamuna_tenmon_reintegration_and_boundary_bind_result_v1.json` … `buildTenmonKatakamunaReintegrationBundleForAutomationV1()` と同期したスナップショット。

## nextOnPass / nextOnFail

- **PASS**: `TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1`
- **FAIL**: `TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_RETRY_CURSOR_AUTO_V1`
