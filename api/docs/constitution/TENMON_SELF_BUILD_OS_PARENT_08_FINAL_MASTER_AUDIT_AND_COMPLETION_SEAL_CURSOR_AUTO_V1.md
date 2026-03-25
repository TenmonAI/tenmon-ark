# TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_CURSOR_AUTO_V1

## 目的

親 1〜7（観測・分類・Cursor kernel・VPS acceptance・自己修復/学習ブリッジ・遠隔投入・周期 governor）を**一束**で監査し、天聞アークが**自己構築 OS として実装圏に到達したか**を最終判定する。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `chat.ts` 本体
- DB schema
- `kokuzo_pages` 正文
- systemd / 環境ファイル
- `/api/chat` 契約

## 監査クラスタ（最低 8 群）

| cluster | 内容 |
|---------|------|
| observe_manifest | P01 manifest / 観測 |
| taxonomy_priority | P02 taxonomy / priority queue |
| cursor_automation_kernel | P03 kernel 成果 |
| vps_acceptance_kernel | P04 VPS acceptance / integrated verdict |
| self_repair_loop | P05 self repair + improvement bridge 系 |
| learning_improvement_bridge | learning_integration_seal / quality_bridge / conversation_bridge |
| feature_autobuild_remote_admin | P06 remote admin / autobuild |
| scheduled_evolution_governor | P07 周波数 governor |

## マスター verdict

- `completed`
- `partially_completed`
- `blocked`
- `dangerous`

## Readiness（0〜100）

- `conversation_readiness`
- `self_build_readiness`
- `self_repair_readiness`
- `remote_admin_readiness`
- `scheduled_evolution_readiness`
- `overall_master_readiness`

## 実装

- `final_master_audit_v1.py` — read-only で `api/automation` の JSON / VPS マーカーを読み、4 成果物 + マーカーを出力
- `completed` 以外では `generated_cursor_apply/TENMON_SELF_BUILD_OS_PARENT_08_..._RETRY...md` を**自動更新**

## 成果物

| ファイル | 説明 |
|---------|------|
| `TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_VPS_V1` | マーカー |
| `final_master_audit.json` | クラスタ別 verdict 統合 |
| `final_master_readiness.json` | 数値 readiness |
| `final_master_blockers.json` | ブロッカー一覧 |
| `final_master_seal.md` | 封印ステータス（付与 / 条件付き / 保留） |

## 実行

```bash
chmod +x api/scripts/final_master_audit_v1.sh
api/scripts/final_master_audit_v1.sh
```

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_08_FINAL_MASTER_AUDIT_AND_COMPLETION_SEAL_RETRY_CURSOR_AUTO_V1`
