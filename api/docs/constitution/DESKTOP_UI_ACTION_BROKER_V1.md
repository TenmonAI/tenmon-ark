# DESKTOP_UI_ACTION_BROKER_V1

**MODE:** `DOCS_FIRST` → `MIN_DIFF_PATCH`  
**目的:** Cursor / デスクトップ UI の基本操作を **権限つき実行器**として扱い、無制限自動化を禁止する。  
**API:** `GET /api/audit/desktop-ui-action-broker-v1` — **スキーマ・規則の提示のみ**（実操作なし）

## 入出力

| 方向 | 型 |
|------|-----|
| 入力 | `ExecutionDispatchV1` **または** `CursorActionDispatchV1` |
| 出力 | `DesktopActionDispatchV1` |

## action types

`focus_window` · `open_app` · `copy_text` · `paste_text` · `click_run` · `click_confirm` · `click_cancel` · `read_visible_text` · `capture_screen_state`

## 状態機械

`desktop_idle` → `desktop_targeting` → `desktop_ready` → `desktop_waiting_review` → `desktop_action_running` → `desktop_result_reading` → `desktop_done` | `desktop_failed`

## 必須フィールド（JSON スキーマ上）

`actionId` · `dispatchId` · `appTarget` · `windowTarget` · `allowedActions[]` · `blockedActions[]` · `requiresHumanApproval` · `reviewReason` · `expectedVisibleMarkers[]` · `forbiddenVisibleMarkers[]` · `resultCapturePath` · `evidenceBundlePath` · `staleScreenGuard` · `retryPolicy` · `failClosed`

## 必須ルール

- high-risk 文脈では **click_run 禁止**
- **expectedVisibleMarkers** が揃うまで操作しない
- **forbiddenVisibleMarkers** 検出で即停止
- no-touch / schema / will / meaning / beauty **主幹に関わる画面**は **reviewRequired**
- 「押せる」≠「押してよい」— 別判定
- **failClosed = true** を既定
- 画面状態が曖昧なら **何もしない**
- 証跡: screen state / visible text / action log

## 次カード

**`BROWSER_AUTONOMOUS_OPERATOR_V1`**
