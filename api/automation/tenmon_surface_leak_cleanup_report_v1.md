# TENMON_SURFACE_LEAK_CLEANUP_REPORT_V1

## 概要

manual probe で確認された **cognition / ku 束の識別子**（`routeEvidenceTraceV1` 等）と **制御行**（`root_reasoning:` 等）を、**routeReason・ku 構造は不変**のまま user-facing 表層から除去する。また **reply / text / answer / message** 優先で本文を抽出し、巨大 JSON planning の直露出を避ける。

## 変更ファイル

| ファイル | 内容 |
|----------|------|
| `api/src/core/tenmonResponseProjector.ts` | `RE_INTERNAL_SURFACE_BUNDLE_IDS`、`extractTenmonUserFacingFinalTextV1`、`stripTenmonInternalSurfaceLeakV1` / `probe` 拡張 |
| `api/src/routes/chat_refactor/surface_exit_trunk_v1.ts` | `cleanLlmFrameV1` 先頭で本文抽出 |
| `api/src/routes/chat_refactor/finalize.ts` | `body` 初期化を `extractTenmonUserFacingFinalTextV1(out.response)` に |
| `api/src/core/responseComposer.ts` | `responseComposer` 入口で同抽出 |
| `api/src/core/tenmonConversationSurfaceV2.ts` | `stripInternalRouteTokensFromSurfaceV1` に識別子一括除去 |

## 抽出ポリシー（fail-closed）

- フィールド優先順: **reply → text → answer → message**（ネストは `response` / `content` / `finalText` / `output` 配下も同順）。
- **素の空文字入力**は空のまま。構造化 JSON / オブジェクトから取り出した結果だけが空のとき、短い安全文へフォールバック。

## manual プローブ（最低 6 本・運用側で実施）

1. `今日は少し疲れています`
2. `この件をどう整理すればいい？`
3. `言霊とは何か`
4. `法華経とは何か`
5. `これはノアの方舟と重なるのでは`
6. `稗田阿礼を深層解読して`

期待: 上記識別子・制御行が表に出ない。巨大 bundle がそのまま返らない。

## 検証

- `npm run check`: **PASS**（実行時ログは `tenmon_surface_leak_cleanup_result_v1.json` 参照）
- 合成: JSON `reply` 抽出・bundle 識別子 strip・projector 経路で `probe.has_internal_leak === false`

## 制約

- commit なし（依頼どおり）
- 新規 route / queue / service 操作なし

## 次カード

- **nextOnPass**: `TENMON_ROOT_ARBITRATION_KERNEL_RESTORE_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_SURFACE_LEAK_CLEANUP_RETRY_CURSOR_AUTO_V1`
