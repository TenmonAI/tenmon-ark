# TENMON_ARTIFACT_WORKTREE_HYGIENE_AND_RELOCK_REPORT_V2

- **generated_at**: `2026-03-29T08:44:53Z`
- **acceptance_pass**: `True`
- **apply_fixes_ran**: `False` (`TENMON_ARTIFACT_HYGIENE_V2_APPLY=1`)
- **git status --short (count)**: 132
- **npm run check**: PASS
- **GET /api/audit**: `{'ok': True, 'http': 200}`

## manual_shelter 扱い

out/manual_shelter 下は autocompact により api/automation/out/archive/*/manual_shelter に複製済み。D 行は重複退避の削除で、index からの除去を推奨。

- 観測された manual_shelter 関連行数: 22（詳細は result json `classified_lines`）
- **index ステージ済み削除行（先頭 `D `）**: 25 行のうち manual_shelter 関連 22 行
- **未ステージのアーカイブ整合削除（` D`）**: 0 パス

## 分類サマリ（パス単位ユニーク）

- **archive**: 25 paths
- **delete_candidate**: 0 paths
- **keep**: 45 paths
- **keep_add_candidate**: 60 paths
- **keep_add_candidate_other**: 2 paths

## keep（必須成果物の存在）

- `api/automation/tenmon_cursor_single_flight_queue_state.json`: OK
- `api/automation/tenmon_conversation_acceptance_probe_relock_cursor_auto_v1.py`: OK
- `api/automation/tenmon_real_chat_ux_acceptance_cursor_auto_v2.py`: OK

## relock / 次カード

- **nextOnPass**: `TENMON_FINAL_ACCEPTANCE_FREEZE_AND_SEAL_CURSOR_AUTO_V4`
- **nextOnFail**: keep/archive/delete candidate 分類のやり直し、誤削除があれば archive から復旧
