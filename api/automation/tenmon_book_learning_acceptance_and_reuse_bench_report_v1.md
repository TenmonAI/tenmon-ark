# TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_REPORT_V1

- **card**: `TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1`
- **観測**: `tenmonBookLearningAcceptanceReuseBenchV1.ts` が `buildKnowledgeBinder` + `applyKnowledgeBinderToKu` を各プローブで実行（HTTP なし）
- **4 枚前提チェーン**: OCR→settlement→katakamuna audit→ARK reuse の**後**に、binder 上で reuse / discern / uncertainty が観測できるかを記録

## プローブ集合

1. カタカムナ系譜（楢崎整理の位置づけ）
2. 宇野多美恵以降の普及と本流の区別（監査 `popularized` + secondary risk または lineage discernment）
3. 天聞再統合の位置づけ（`sourceMode === tenmon_reintegration`）
4. 言霊秘書 / 水穂伝 / 稲荷古伝の root 差分
5. 空海 / 法華 / サンスクリットの mapping / comparative 問い

## 観測チェック（fail-closed）

- `arkBookCanonConversationReuseV1` + `evidence_binder.ref_slugs`（Notion 生ではなく judge 束）
- `sourceLayerDiscernmentV1` で root / mapping / reintegration の分離シグナル
- uncertainty: binder flags / verdict uncertainty / ARK registry / threadMeaning `unresolvedAxes` のいずれかがベンチ全体で非ゼロ
- 宇野プローブで監査上 `uno_tamie_popular` が `popularized` のままであること

## 次カード

- **nextOnPass**: `TENMON_BOOK_LEARNING_DEEP_XRAY_AND_QUALITY_FORENSIC_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_RETRY_CURSOR_AUTO_V1`

<!-- BOOK_LEARNING_BENCH_AUTO_BEGIN -->

- **acceptance_pass**: `True`
- **npm_run_check_ok**: `True`
- **probe_acceptance_pass**: `True`

### プローブ要約

- `bench_katakamuna_lineage` ark=`True` mode=`lineage_discernment` sec_risk=`False` tmm_axes=`2`
- `bench_uno_popularization` ark=`True` mode=`lineage_discernment` sec_risk=`True` tmm_axes=`2`
- `bench_tenmon_reintegration` ark=`True` mode=`tenmon_reintegration` sec_risk=`False` tmm_axes=`2`
- `bench_root_khs_mizuho_inari` ark=`True` mode=`lineage_discernment` sec_risk=`False` tmm_axes=`2`
- `bench_kukai_hokekyo_sanskrit` ark=`True` mode=`historical_fact` sec_risk=`False` tmm_axes=`1`

<!-- BOOK_LEARNING_BENCH_AUTO_END -->
