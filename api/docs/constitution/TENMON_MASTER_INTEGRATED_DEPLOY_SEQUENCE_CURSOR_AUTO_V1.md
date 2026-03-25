# TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_CURSOR_AUTO_V1

## 目的

7 枚の子 Cursor カードを **依存順・安全順** で束ね、単一キャンペーンとして

1. 出力契約の正規化  
2. NAS / backup / sync の実在確認（診断優先）  
3. verdict の真値統一  
4. self-improvement OS 親完成  
5. kokuzo self-learning + self-improvement 親完成  
6. feature autobuild OS 親完成  
7. remote cursor command center 親完成  

までを前進させる **親 campaign** である。

## 方針

- 親カード自身は **オーケストレーション（JSON / Python）のみ**。実装は子カードに分散。
- 実行順は固定（`master_integrated_deploy_sequence_manifest.json`）。
- いずれかが FAIL したら、その子の `FAIL_NEXT_CARD` を起票し、依存先は `blocked_by_dependency`（pending 扱い）。
- 途中成果物は削除しない。

## 依存ルール（要約）

| 子カード | 前提 |
|----------|------|
| 1,2 | なし（2 は独立だが 3 以降の integrated verdict に storage を流す） |
| 3 | 1, 2 |
| 4 | 1, 3 |
| 5 | 1, 3, 4 |
| 6 | 1, 3 |
| 7 | 6 |

## 実装ファイル

| 種別 | パス |
|------|------|
| manifest | `api/automation/master_integrated_deploy_sequence_manifest.json` |
| progress | `api/automation/master_integrated_deploy_sequence_progress.json` |
| summary | `api/automation/master_integrated_deploy_sequence_summary.json` |
| blockers | `api/automation/master_integrated_deploy_sequence_blockers.json` |
| readiness delta | `api/automation/integrated_readiness_delta.json` |
| オーケストレータ | `api/automation/master_integrated_deploy_sequence_v1.py` |
| 集約 out | `api/automation/out/tenmon_master_integrated_deploy_sequence_v1/` |
| 子カード本文 | `api/automation/generated_cursor_apply/<CARD>.md` |
| 親カード本文 | `api/automation/generated_cursor_apply/TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_CURSOR_AUTO_V1.md` |

## VPS 検証

```bash
bash api/src/scripts/tenmon_master_integrated_deploy_sequence_vps_v1.sh
```

生成物:

- `api/automation/TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_VPS_V1`（マーカー）
- `master_integrated_deploy_sequence_*`（manifest と同ディレクトリにコピー）
- `api/automation/out/tenmon_master_integrated_deploy_sequence_v1/` 下の mirror

## optional acceptance

`optional_acceptance_paths` に定義したファイルが **すべて存在**し、かつ **依存が解決**している場合のみ自動 `completed`。誤完了を防ぐため、未実装カードは専用 out パスを使う。

## FAIL_NEXT

- キャンペーン全体: `TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_RETRY_CURSOR_AUTO_V1`
