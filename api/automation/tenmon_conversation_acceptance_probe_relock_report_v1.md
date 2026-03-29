# TENMON_FINAL_ACCEPTANCE_PROBE_AND_AUTONOMY_RELOCK_REPORT_V1 (P4)

- **generated_at**: `2026-03-29T03:07:33Z`
- **acceptance_pass**: `False`
- **chat_url**: `http://127.0.0.1:3000/api/chat`
- **mode**: 観測専用（本スクリプトは記録のみ）

## 不合格理由（要約）

- `surface_leak_probe_count=18>cap_5`
- `surface_cleanliness=0.100<0.85`
- `support_operability=0.000<0.9`
- `founder_operability=0.000<0.8`
- `uncertainty_maturity=0.200<0.7`
- `one_step_coverage=0.067<0.8`
- `billing_link_not_404_failed:{'reachable': True, 'http': 404, 'not_404': False}`

## UX 指標（再ロック）

- **surface_leak_probe_count**: 18 (cap 5)
- **surface_cleanliness**: 0.100 (min 0.85)
- **full_autonomy_system_ready**: `{'score': 0.375, 'billing_not_404': False, 'audit_ok': True, 'npm_run_check_ok': True, 'chat_url_ok': True, 'surface_cleanliness_ok': False, 'support_operability_ok': False, 'founder_operability_ok': False, 'uncertainty_maturity_ok': False}`
- **support_operability**: 0.000 (min 0.9)
- **founder_operability**: 0.000 (min 0.8)
- **uncertainty_maturity**: 0.200 (min 0.7)
- **one_step_coverage**: 0.067 (min 0.8)
- **overall_verdict**: `ux_needs_surface_or_route_repair`

## 集計

- **probe_ok_count**（無 leak・長さ）: 2 / 20
- **continuity_bonus**: 22 (min 5)
- **carried_topic (true のペア数)**: 5 (min 1)
- **npm run check**: PASS
- **audit ok**: `True`
- **billing /api/billing/link**: `{'reachable': True, 'http': 404, 'not_404': False}`
- **internal_leak_residual**: `['book_reading_1:center_meta_colon', 'book_reading_1:root_reasoning_colon', 'book_reading_1:次観測_meta', 'book_reading_1:次軸_meta', 'book_reading_2:root_reasoning_colon', 'book_reading_2:次観測_meta', 'book_reading_2:次軸_meta', 'book_reuse:root_reasoning_colon', 'book_reuse:次観測_meta', 'book_reuse:次軸_meta', 'continuity_1_1:center_meta_colon', 'continuity_1_1:次観測_meta', 'continuity_1_1:次軸_meta', 'continuity_2_1:center_meta_colon', 'continuity_2_1:root_reasoning_colon', 'continuity_2_1:次観測_meta', 'continuity_2_1:次軸_meta', 'continuity_3_1:root_reasoning_colon', 'continuity_3_1:次観測_meta', 'continuity_3_1:次軸_meta', 'define_hokekyo:root_reasoning_colon', 'define_hokekyo:truth_structure_colon', 'define_kotodama:root_reasoning_colon', 'define_kotodama:truth_structure_colon', 'founder_card:root_reasoning_colon', 'founder_card:次観測_meta', 'founder_card:次軸_meta', 'founder_change:root_reasoning_colon', 'founder_change:次観測_meta', 'founder_change:次軸_meta', 'founder_update:root_reasoning_colon', 'founder_update:次観測_meta', 'founder_update:次軸_meta', 'general_tired:center_meta_colon', 'general_tired:次観測_meta', 'general_tired:次軸_meta', 'longform_1:root_reasoning_colon', 'longform_1:truth_structure_colon', 'longform_1:中心命題_meta', 'longform_1:次観測_meta', 'longform_1:次軸_meta', 'longform_2:root_reasoning_colon', 'longform_2:truth_structure_colon', 'longform_2:中心命題_meta', 'longform_2:次観測_meta', 'longform_2:次軸_meta', 'pair_fatigue_nextstep_1:center_meta_colon', 'pair_fatigue_nextstep_1:次観測_meta', 'pair_fatigue_nextstep_1:次軸_meta', 'pair_lotus_waterfire_1:root_reasoning_colon', 'pair_lotus_waterfire_1:truth_structure_colon', 'pair_lotus_waterfire_2:center_meta_colon', 'pair_lotus_waterfire_2:root_reasoning_colon', 'pair_lotus_waterfire_2:次観測_meta', 'pair_lotus_waterfire_2:次軸_meta', 'support_billing:root_reasoning_colon', 'support_billing:次観測_meta', 'support_billing:次軸_meta', 'support_bug:root_reasoning_colon', 'support_bug:次観測_meta', 'support_bug:次軸_meta', 'support_login:中心命題_meta', 'support_pwa:中心命題_meta', 'support_register:中心命題_meta', 'symbolic_noah:root_reasoning_colon', 'symbolic_noah:次観測_meta', 'symbolic_noah:次軸_meta', 'uncertainty_sparse:root_reasoning_colon', 'uncertainty_sparse:次観測_meta', 'uncertainty_sparse:次軸_meta']`

## UX プローブ 20 本

- `general_tired` (general): ok=False len=217 ONE_STEP=False unc_surf=False founder_mk=True leaks=['center_meta_colon', '次軸_meta', '次観測_meta']
- `general_organize` (general): ok=True len=117 ONE_STEP=True unc_surf=False founder_mk=False leaks=[]
- `support_bug` (support): ok=False len=208 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `support_login` (support): ok=False len=181 ONE_STEP=False unc_surf=False founder_mk=False leaks=['中心命題_meta']
- `support_billing` (support): ok=False len=228 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `support_register` (support): ok=False len=181 ONE_STEP=False unc_surf=False founder_mk=False leaks=['中心命題_meta']
- `support_pwa` (support): ok=False len=208 ONE_STEP=False unc_surf=False founder_mk=False leaks=['中心命題_meta']
- `define_kotodama` (define): ok=False len=283 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', 'truth_structure_colon']
- `define_hokekyo` (define): ok=False len=338 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', 'truth_structure_colon']
- `symbolic_noah` (symbolic): ok=False len=210 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `founder_update` (founder): ok=False len=257 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `founder_change` (founder): ok=False len=174 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `founder_card` (founder): ok=False len=247 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `uncertainty_sparse` (uncertainty): ok=False len=237 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `uncertainty_claim` (uncertainty): ok=True len=73 ONE_STEP=False unc_surf=False founder_mk=False leaks=[]
- `longform_1` (longform): ok=False len=714 ONE_STEP=True unc_surf=False founder_mk=False leaks=['root_reasoning_colon', 'truth_structure_colon', '次軸_meta', '次観測_meta', '中心命題_meta']
- `longform_2` (longform): ok=False len=466 ONE_STEP=True unc_surf=False founder_mk=False leaks=['root_reasoning_colon', 'truth_structure_colon', '次軸_meta', '次観測_meta', '中心命題_meta']
- `book_reading_1` (book): ok=False len=210 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', 'center_meta_colon', '次軸_meta', '次観測_meta']
- `book_reading_2` (book): ok=False len=353 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']
- `book_reuse` (book): ok=False len=205 ONE_STEP=False unc_surf=False founder_mk=False leaks=['root_reasoning_colon', '次軸_meta', '次観測_meta']

## Continuity pairs

- `continuity_1`: first_ok=False second_ok=True carried=True ONE_STEP=True
- `continuity_2`: first_ok=False second_ok=True carried=True ONE_STEP=True
- `continuity_3`: first_ok=False second_ok=True carried=True ONE_STEP=True
- `pair_lotus_waterfire`: first_ok=False second_ok=False carried=True ONE_STEP=False
- `pair_fatigue_nextstep`: first_ok=False second_ok=True carried=True ONE_STEP=True

## 次カード

- **nextOnPass**: `TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_SURFACE_LEAK_CLEANUP_RETRY_CURSOR_AUTO_V3`
