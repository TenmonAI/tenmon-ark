# TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_CURSOR_AUTO_V1

## 目的

`self_build_manifest.json` を入力に、**未達要素**を **blocker taxonomy** に分類し、`ready` / `pending` / `blocked` / `dangerous` の **優先順位キュー** と **`next_cards`（1〜3）** を生成する。以後の自己改善で「いま何をやるか」を秩序立てて固定する。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `api/src/routes/chat.ts`
- route 本体
- DB schema
- `kokuzo_pages` 正文
- `/api/chat` 契約

## Taxonomy ID（最低 12）

`surface`, `route`, `longform`, `density`, `runtime_acceptance`, `learning_input_quality`, `learning_seed_quality`, `evidence_grounding`, `seal_contract`, `self_repair`, `cursor_execution`, `remote_admin`

各 blocker に付与: `severity`, `confidence`, `dependency_guess`（manifest 由来）, `recommended_stage`

## 未達の定義

manifest の `status_guess` が `minimal_stub?` / `empty` / `missing` / `unreadable` の行のみ taxonomy の `blockers` に載る（read-only 観測）。

## 出力（正本）

| ファイル | 内容 |
|---------|------|
| `api/automation/self_build_blocker_taxonomy.json` | 定義 + blockers 配列 |
| `api/automation/self_build_priority_queue.json` | 4 キュー + `next_cards` |
| `api/automation/self_build_dangerous_cards.json` | dangerous のみ抜粋 |

**注意:** ルートの `blocker_taxonomy.json` / `priority_queue.json`（Observation OS 用）は**上書きしない**。

## VPS 検証用エイリアス（カード指定名）

次のディレクトリに **同名**で複製される:

`api/automation/out/tenmon_self_build_parent_02_v1/`

- `blocker_taxonomy.json`
- `priority_queue.json`
- `dangerous_cards.json`

## 実行順

```bash
cd api/automation
python3 self_build_manifest_v1.py
python3 self_build_taxonomy_v1.py
python3 self_build_priority_queue_v1.py
```

## ポリシー

- `dangerous_cards`: `chat.ts` / `dist` / `kokuzo_pages` 本文相当パス等 → **自動適用対象から除外**
- `next_cards`: `ready` 優先、無ければ `pending`、それでも無ければ **manifest 再観測** の合成 1 枚

## VPS マーカー

`api/automation/TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_VPS_V1`

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_RETRY_CURSOR_AUTO_V1` — `generated_cursor_apply/TENMON_SELF_BUILD_OS_PARENT_02_TAXONOMY_AND_PRIORITY_RETRY_CURSOR_AUTO_V1.md`
