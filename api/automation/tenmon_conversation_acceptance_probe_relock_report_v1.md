# TENMON_CONVERSATION_ACCEPTANCE_PROBE_RELOCK_REPORT_V1

- **generated_at**: `2026-03-28T22:30:17Z`
- **acceptance_pass**: `False`
- **chat_url**: `http://127.0.0.1:3000/api/chat`
- **mode**: 観測専用（本スクリプトは記録のみ）

## 不合格理由（要約）

- `probe_ok_count=1<6`
- `internal_leak_in_response_text`

## 集計

- **probe_ok_count**: 1 (min 6)
- **continuity_bonus**: 7 (min 6)
- **carried_topic (true のペア数)**: 2 (min 2)
- **npm run check**: PASS
- **audit ok**: `True`
- **internal_leak_residual**: `['manual_0:root_reasoning_colon', 'manual_0:truth_structure_colon', 'manual_1:root_reasoning_colon', 'manual_1:truth_structure_colon', 'manual_2:center_meta_colon', 'manual_4:root_reasoning_colon', 'manual_5:root_reasoning_colon', 'pair_fatigue_nextstep_1:center_meta_colon', 'pair_lotus_waterfire_1:root_reasoning_colon', 'pair_lotus_waterfire_1:truth_structure_colon', 'pair_lotus_waterfire_2:center_meta_colon', 'pair_lotus_waterfire_2:root_reasoning_colon']`

## Manual 6 本

- `manual_0`: ok=False len=283 leaks=['root_reasoning_colon', 'truth_structure_colon']
- `manual_1`: ok=False len=338 leaks=['root_reasoning_colon', 'truth_structure_colon']
- `manual_2`: ok=False len=217 leaks=['center_meta_colon']
- `manual_3`: ok=True len=117 leaks=[]
- `manual_4`: ok=False len=225 leaks=['root_reasoning_colon']
- `manual_5`: ok=False len=259 leaks=['root_reasoning_colon']

## Continuity pairs

- `pair_lotus_waterfire`: first_ok=False second_ok=False carried=True ONE_STEP=False
- `pair_fatigue_nextstep`: first_ok=False second_ok=True carried=True ONE_STEP=True

## 次カード

- **nextOnPass**: `TENMON_DEEPREAD_EDUCATION_PARENT_RESUME_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_SURFACE_EXIT_LEAK_GUARD_RELOCK_RETRY_CURSOR_AUTO_V1`
