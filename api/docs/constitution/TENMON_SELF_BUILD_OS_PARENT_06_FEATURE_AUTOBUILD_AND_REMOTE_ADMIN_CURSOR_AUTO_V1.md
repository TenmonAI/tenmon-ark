# TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_CURSOR_AUTO_V1

## 目的

**新機能自動構築**と**管理者専用ダッシュボードからの遠隔投入**を統合し、外出先からでも Cursor 自動構築カードを投入できる**管理者経路**を提供する（一般ユーザー chat 面とは分離）。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `chat.ts` 本体
- DB schema
- `kokuzo_pages` 正文
- `/api/chat` 契約
- 公開ユーザー向けチャット面

## 受け付ける intake 種別

| kind | 内容 |
|------|------|
| `cursor_autobuild_card` | 単一 Cursor autobuild カード |
| `multi_card_campaign` | 複数カードのキャンペーン |
| `retry_card` | リトライカード |
| `maintenance_card` | メンテナンスカード |
| `feature_spec_card` | 機能意図テキスト → オーケストレータが `feature_autobuild_plan.json` を生成 |

## 実装

| コンポーネント | 説明 |
|---------------|------|
| `api/src/founder/remoteAdminGuardV1.ts` | 種別ごとにカード断片へ展開し `remoteCursorGuardV1` で検査 |
| `api/src/routes/adminRemoteIntake.ts` | `POST /api/admin/remote-intake/submit` ほか（Founder 必須） |
| `api/automation/remote_admin_intake_v1.py` | CLI 投入（JSON ファイル / stdin） |
| `api/automation/feature_autobuild_orchestrator_v1.py` | intent → spec → カード分割 → 実行順（**自動実行なし**） |
| `api/scripts/remote_admin_intake_v1.sh` | ペイロード JSON を渡して CLI 実行 |

## 方針

- **承認ゲート必須**: 既定は `approval_required`。`force_approve` は **high risk では無効**。
- **high risk は自動実行しない**: `dry_run_only` / `auto_execution_allowed: false`。
- **feature フロー**: intent（`feature_spec_card`）→ `feature_autobuild_orchestrator_v1.py` → `feature_autobuild_plan.json`（カードは承認後に別キューへ）。

## 成果物（VPS / automation）

| ファイル | 説明 |
|---------|------|
| `TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_VPS_V1` | マーカー |
| `remote_admin_queue.json` | 管理者投入キュー |
| `feature_autobuild_plan.json` | オーケストレータ出力 |
| `approval_gate_result.json` | 直近のゲート判定 |

## HTTP（管理者）

- `GET /api/admin/remote-intake/dashboard` — 簡易フォーム
- `POST /api/admin/remote-intake/submit` — 投入
- `GET /api/admin/remote-intake/queue` — 一覧
- `POST /api/admin/remote-intake/approve` — `id` を ready に

認証: `tenmon_founder` cookie または `X-Founder-Key: $FOUNDER_KEY`

## CLI

```bash
chmod +x api/scripts/remote_admin_intake_v1.sh
echo '{"kind":"feature_spec_card","intent_text":"管理者向けダッシュボードに観測パネルを追加"}' \
  | python3 api/automation/remote_admin_intake_v1.py --stdin --source chatgpt_export
# または
api/scripts/remote_admin_intake_v1.sh /path/to/payload.json
```

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_06_FEATURE_AUTOBUILD_AND_REMOTE_ADMIN_RETRY_CURSOR_AUTO_V1`
