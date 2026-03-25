# TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_CURSOR_AUTO_V1

## 目的

VPS 上で **build / restart / health / audit / chat runtime probe matrix / worldclass seal / rollback 提案 / forensics** を一体実行し、**`integrated_final_verdict.json`** で `static` / `runtime` / `surface` / `overall` を一意に閉じる acceptance kernel。

## 非対象（DO NOT TOUCH）

- `dist/**`（ビルド成果物は検証のみ）
- `chat.ts` 本体
- DB schema
- `kokuzo_pages` 正文
- **systemd 環境ファイル**（unit 定義の編集は行わない）
- `/api/chat` 契約

## 実装方針

- 本体フローは既存 **`vps_acceptance_os_v1.py`** を子プロセス実行（DRY）
- kernel は **4 軸 verdict** 用に `final_verdict.json` から **surface** を合成し、`integrated_final_verdict.json` を正本として `api/automation` に書く
- **PASS**（`overall.ok`）: 子が生成した seal / baseline 更新ロジックをそのまま利用
- **FAIL**: `blockers` / `evidence` / `next_card` を `integrated_final_verdict.json` に格納し、`failure_forensics_bundle.json` を安定パスに同期

## 成果物（VPS）

| ファイル | 説明 |
|---------|------|
| `TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_VPS_V1` | マーカー |
| `vps_acceptance_kernel_result.json` | kernel メタ・パス一覧 |
| `integrated_final_verdict.json` | static / runtime / surface / overall |
| `final_verdict.json` | 上記と同一内容（互換名） |
| `failure_forensics_bundle.json` | 失敗時は採取済み（子が生成・kernel が automation に同期） |

スナップショット: `api/out/tenmon_vps_acceptance_kernel_v1/<timestamp>/`（`--out-dir` で上書き可）

## 実行

```bash
api/scripts/vps_acceptance_kernel_v1.sh
# seal 省略（CI 向け）:
cd api/automation && python3 vps_acceptance_kernel_v1.py --skip-seal-script
```

## 環境変数（既存と同様）

- `CHAT_TS_PROBE_BASE_URL`
- `VPS_ACCEPTANCE_SKIP_RESTART=1` で `build_restart_wrapper` の restart スキップ
- 子 seal 実行時は `vps_acceptance_os_v1` と同様 `CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART` 等が設定される

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_04_VPS_ACCEPTANCE_AND_SEAL_KERNEL_RETRY_CURSOR_AUTO_V1` — `generated_cursor_apply/` に `.md` 生成
