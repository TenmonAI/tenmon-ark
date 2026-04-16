# TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_CURSOR_AUTO_V1

## 目的

TENMON-ARK **自己構築 OS の最上流** として、`api` 配下の **automation / scripts / constitution / generated_cursor_apply** を横断観測し、**machine-readable な唯一の起点 manifest** を生成する。以後の親カード・子カードは **`self_build_manifest.json` を入力**として参照できる状態にする。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `api/src/routes/chat.ts`
- 既存 route 実装本体
- DB schema
- `kokuzo_pages` 正文
- systemd env
- `/api/chat` 契約

## 方針

- **read-only 観測**のみ（ファイル内容の変更なし）
- 正本: **`api/automation/self_build_manifest.json`**
- 人間用要約: **`api/automation/self_build_manifest_summary.md`**

## 分類（5 群）

| group id | 範囲 |
|----------|------|
| `automation_scripts` | `api/automation/**/*.py`（学習/seal 系ヒューリスティック除外分） |
| `constitution_docs` | `api/docs/constitution/**/*.md` |
| `generated_cursor_cards` | `api/automation/generated_cursor_apply/**/*.md` |
| `runtime_verification_scripts` | `api/scripts/**/*.{sh,py}` |
| `learning_seed_seal_scorer` | `api/automation/**/*.py` のうちファイル名が学習・seed・seal・scorer・観測・orchestrator 等に該当 |

各 **entry** には少なくとも: `exists`, `file_path`, `group`, `role`, `status_guess`, `dependency_guess`（Python は import 先の粗い推定）

## 実行

```bash
api/scripts/self_build_manifest_v1.sh
# または
cd api/automation && python3 self_build_manifest_v1.py
```

## VPS マーカー

`api/automation/TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_VPS_V1`

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_RETRY_CURSOR_AUTO_V1` — `generated_cursor_apply/TENMON_SELF_BUILD_OS_PARENT_01_OBSERVE_AND_MANIFEST_RETRY_CURSOR_AUTO_V1.md`
