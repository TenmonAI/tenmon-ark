# TENMON_PHASE6_5_EMPTY_CATCH_RECOVERY_V1 Inventory

## 概要

`api/src/routes/chat.ts` 内の空 `catch {}` を全件列挙し、分類した結果を記録する。
本インベントリは挙動を変えない。観測と棚卸しのみを目的とする。

## 集計

| 分類 | 件数 | 説明 |
|---|---|---|
| harmless | 18 | db.close やプロパティコピーなど、失敗しても影響が極小 |
| observability_loss | 35 | routeReason, rewriteDelta, voiceGuard, evidence 等の観測データが消失する |
| route_corruption_risk | 22 | 応答テキスト変更、ルート判定、persistTurn 等が失敗しても気づけない |
| fatal_masking | 0 | res.json や LLM 呼び出しを直接握りつぶすものは検出されなかった |
| **合計** | **75** | |

## harmless（18件）

これらは失敗しても応答品質やルーティングに影響しない。ただし、ログを出さないことで将来の調査を困難にする可能性がある。

| 行番号 | 文脈 |
|---|---|
| 394 | memoryPersistMessage（assistant側） |
| 697 | db.close?.() |
| 699 | kokuzo_glossary SELECT 全体 |
| 1418 | プロパティコピー |
| 1519 | プロパティコピー |
| 1586 | snippet 取得 |
| 1765 | プロパティコピー |
| 1802 | プロパティコピー |
| 1805 | プロパティコピー |
| 1821 | プロパティコピー |
| 1838 | プロパティコピー |
| 1885 | プロパティコピー |
| 1988 | プロパティコピー |
| 2107 | v3 out assignment（disabled） |
| 2436 | プロパティコピー |
| 2685 | memory count |
| 3604 | snippet 取得 |
| 3779 | heart state コピー |

## observability_loss（35件）

これらは失敗すると、routeReason, rewriteDelta, voiceGuard, evidence, kanagiPhase 等の観測データが消失する。デバッグや監査が困難になる。

| 行番号 | 文脈 |
|---|---|
| 334 | decisionFrame ku プロパティ注入 |
| 338 | origJson ラップ全体 |
| 984 | route 判定結果の構築 |
| 1039 | route 判定結果の構築 |
| 1142 | rewriteUsed / rewriteDelta 注入 |
| 1154 | routeReason mirror |
| 1301 | rewriteDelta 注入 |
| 1368 | lengthIntentRaw 注入 |
| 1372 | lengthIntent 注入 |
| 1508 | detailPlan 構築 |
| 1514 | detailPlan 構築 |
| 1556 | detailPlan 構築 |
| 1559 | detailPlan 構築 |
| 1670 | voiceGuard 判定 |
| 1730 | voiceGuard 判定 |
| 1799 | rewriteDelta 注入 |
| 1915 | detailPlan 構築 |
| 2023 | voiceGuard 判定 |
| 2025 | voiceGuard 判定 |
| 2058 | voiceGuard 判定 |
| 2128 | voiceGuard 判定 |
| 2189 | rewriteUsed / rewriteDelta 注入 |
| 2657 | voiceGuard 判定 |
| 2717 | kanagiPhase 注入 |
| 2719 | kanagiPhase 注入（外側） |
| 2783 | kanagi 処理全体 |
| 2977 | voiceGuard 判定 |
| 2989 | rewriteUsed / rewriteDelta 注入 |
| 3117 | debug 情報構築 |
| 3163 | appliedRulesCount 注入 |
| 3337 | deterministic flags 構築 |
| 3424 | evidence 注入 |
| 3427 | evidence 構築全体 |
| 3471 | 不明（要確認） |
| 3475 | 不明（要確認） |

## route_corruption_risk（22件）

これらは失敗すると、応答テキストの変更、ルート判定の上書き、メモリ永続化が無言で失敗する。ユーザーへの応答品質に直接影響する。

| 行番号 | 文脈 |
|---|---|
| 388 | memoryPersistMessage（user側） |
| 470 | clearThreadState |
| 477 | persistTurn（合言葉応答） |
| 491 | persistTurn（合言葉登録） |
| 502 | 合言葉ブロック全体 |
| 1001 | FASTPATH_GREETING_TOP 応答構築 |
| 1178 | FASTPATH_GREETING_OVERRIDDEN 判定 |
| 1211 | response テキスト変更 |
| 1261 | response テキスト変更 |
| 1296 | response テキスト変更 |
| 1616 | response 構築 |
| 1656 | response 構築 |
| 1693 | response 構築 |
| 1753 | response 構築 |
| 2095 | opinionFirst 判定 |
| 2169 | response テキスト追記（「一点だけ。どこを確かめますか？」） |
| 2175 | opinionFirst 判定 |
| 2180 | 応答ブロック全体 |
| 2668 | 応答ブロック全体 |
| 2993 | nat.responseText 設定 |
| 3626 | evidence 構築 |
| 3772 | compassionWrap / supportSanitize |

## 解消方針

本インベントリの解消は、以下の原則に従って段階的に行う。

1. **harmless**: `console.debug("[CATCH_SILENT]", e)` を追加する。挙動は変えない。
2. **observability_loss**: `console.warn("[CATCH_OBS]", context, e)` を追加する。挙動は変えない。
3. **route_corruption_risk**: `console.error("[CATCH_ROUTE]", context, e)` を追加し、将来的にエラーハンドリングを検討する。挙動は変えない。
4. **fatal_masking**: 該当なし。

すべての変更は「ログ追加のみ」とし、route 意味論を変えない。
