# TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_CURSOR_AUTO_V1

## 目的

管理者ダッシュボードから Mac Cursor 遠隔自動構築までの **end-to-end 7層** を監査し、`complete` / `partial` / `blocked` を判定する最終 seal。

## 監査対象（7層）

1. admin dashboard exists  
2. job normalizer works  
3. mac bridge works  
4. cursor executor works  
5. result collector works  
6. seal / rollback works  
7. dashboard status reflection works

## 実装

| 種別 | パス |
|------|------|
| 監査本体 | `api/automation/admin_remote_build_full_audit_v1.py` |
| VPS 実行 | `api/src/scripts/tenmon_admin_remote_build_full_audit_vps_v1.sh` |
| verdict | `api/automation/out/admin_remote_build_end_to_end_verdict.json` |
| missing contracts | `api/automation/out/admin_remote_build_missing_contracts.json` |
| focused next cards | `api/automation/out/focused_next_cards_manifest.json` |

## 判定

- `complete`: 7層すべて成立（`sealed_remote_build_platform=true`）
- `partial`: 1つ以上未達（focused next cards を 1〜3 枚生成）
- `blocked`: 危険パッチ等で止めるべき状態

## VPS 検証

```bash
bash api/src/scripts/tenmon_admin_remote_build_full_audit_vps_v1.sh
```

## FAIL 次カード

- `TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_RETRY_CURSOR_AUTO_V1`

