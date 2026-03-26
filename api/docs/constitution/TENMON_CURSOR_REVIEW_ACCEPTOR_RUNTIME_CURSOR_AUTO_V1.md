# TENMON_CURSOR_REVIEW_ACCEPTOR_RUNTIME_CURSOR_AUTO_V1

## 目的

Cursor の **Review / 承認系ダイアログ**が残っているとき、**Mac の UI 補助のみ**（`osascript` + `System Events`）でボタンを探索・クリックする経路を提供する。非 Mac やゲート違反時は **fail-closed**（`manual_review_required=true`）。**product core は変更しない**。成功の捏造はしない。

## 実装

- `api/automation/cursor_review_acceptor_v1.py`
- watch loop 連携（既存）: `api/scripts/tenmon_cursor_watch_loop.sh` の `TENMON_REVIEW_ACCEPT_ENABLE` / `TENMON_MAC_REVIEW_ACCEPTOR_SCRIPT`

## CLI

```bash
python3 api/automation/cursor_review_acceptor_v1.py [--manifest PATH | --item-json PATH] [--timeout-sec 25] [--poll-sec 0.4]
```

## ボタン探索順（固定）

1. `Continue without reverting`
2. `Review`
3. `Keep All`
4. `Accept All`
5. `Apply All`

各ラベルについて、**Cursor プロセスの window → sheet → 1 段 group** 内の `button` を走査する。

## 出力 JSON（必須）

| フィールド | 意味 |
|------------|------|
| `ok` | 自動クリック経路で完了したか |
| `clicked` | 押したボタン名の列（順序付き） |
| `manual_review_required` | 人手が必要なら `true` |
| `reason` | 短文コード（成功・失敗の理由） |

後方互換のため `status`（`accepted` / `manual_review_required`）、`timeout`、`legacy_card` を併記する。

## high-risk / 状態ゲート（manual_review_required）

manifest / item JSON を読み取り、次のとき **クリックしない**（`ok: false`）:

- `state == approval_required` または `rejected`
- `high_risk == true` または `risk_tier` が high/critical/escrow 等で、かつ **`escrow_approved` が true でない**

任意の追加ブロック: 環境変数 `TENMON_REVIEW_ACCEPTOR_BLOCK_SUBSTRINGS`（カンマ区切り小文字断片）— item JSON 文字列に含まれると manual。

## fail-closed

- **非 Darwin**: `reason=non_darwin_environment`
- **Cursor 起動不可 / activate 失敗**: `cursor_activate_failed:…`
- **タイムアウト**: `reason=timeout`（必要なら `error:` 接尾）
- いずれも `ok: false` / `manual_review_required: true`

## nextOnPass

`TENMON_NETWORK_SESSION_RESCUE_AND_TOKEN_RECOVERY_CURSOR_AUTO_V1`

## nextOnFail

停止。review acceptor retry 1 枚のみ生成。
