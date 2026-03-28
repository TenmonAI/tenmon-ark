# TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_CURSOR_AUTO_V1

## 結果

- **`npm run check`（`api/`）: PASS**
- **queue**: `tenmon_cursor_single_flight_queue_v1.py` で JSON 取得 OK、`next_card_allowed: true` 維持
- **K1 修復**: `finalize.ts` の `K1_TRACE_STRIPPED_EMPTY_BRIDGE_V1` ブロックは **未巻き戻し**
- **commit**: なし
- **shelter**: `api/automation/out/manual_shelter/**` は **未編集**・無差別復帰なし

## 欠落の観測

初回 `tsc --noEmit` は **TS2307（モジュール解決不能）** が中心。分類すると次のとおり。

| 分類 | 例 |
|------|-----|
| missing file | `answerProfileLayer.ts`、`tenmonLongformComposerV1.ts` 等 |
| missing import | 上記に対する `./foo.js` import |
| cascade | multipass 型不足・`threadCenterRecovery` の戻り型など（第2ラウンドで解消） |

## 修復方針（本カードの制約内）

1. **`git checkout HEAD -- <path>`**  
   対象パスは **現在ブランチの履歴に存在しない**（`git cat-file HEAD:…` が失敗）ため **使用不可**。

2. **shelter からの selective restore**  
   手元バッチ `manual_shelter/20260328T132440Z` 内に **該当 `.ts` が見つからず**未使用。

3. **最小スタブ**  
   `npm run check` が要求する **export / 型 / 定数** だけを満たす **新規 `.ts`** を追加。ランタイムの本番挙動は **no-op または空データ既定** とし、**会話主線の既存ファイル（`chat.ts` / `finalize.ts` / `responseComposer.ts` 等）の論理は変更しない**。

## 追加・微修正したファイル

- **新規（core）**: `answerProfileLayer`、`confidenceDisplayLogic`、`issueContinuityKernel`、`katakamunaMisreadExpansionGuard`、`misreadExpansionAndSpeculativeGuard`、`structuralCompatibilityAndRootSeparation`、`tenmonBookReadingKernelV1`、`tenmonConversationDiscernmentProjectorV1`、`tenmonLongformComposerV1`、`tenmonMultipassAnsweringV1`、`tenmonPersonaConstitutionRuntimeV1`、`tenmonVerdictEngineV1`、`threadCenterRecoveryV1`、`userLexiconMemoryV1`
- **新規（deepread）**: `sanskritGodnameSchemaV1`、`sanskritRootEngineV1`、`tenmonGodnameMapperV1`、`tenmonGodnameRelationsV1`
- **既存 1 行級**: `tenmonBookReadingToDeepreadBridgeV1.ts`（handoff map の型）、`sanskritAlignmentJudgeV1.ts`（`map` コールバックの型注釈）

## 注意（次段）

スタブは **ビルド緑化が目的**であり、知識束・梵字 deepread・verdict 等の **本来の意味内容は復元していない**。本番品質が必要なら、**原本のあるコミット／バックアップからの差分復元**か、カード単位の再実装が別途必要。

## nextOnPass

`TENMON_INPUT_COGNITION_SPLITTER_CURSOR_AUTO_V1`

## nextOnFail（未使用）

`TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_RETRY_CURSOR_AUTO_V1`
