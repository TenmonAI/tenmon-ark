# TENMON_WEAK_ROUTE_3LANE_REHYDRATION_PARENT_CURSOR_AUTO_V1

## 目的

思想幹線の再構築は行わず、弱接続3レーンのみを対象に最小diffで再水和を実行し、
`build -> restart -> /api/health -> /api/audit.build -> probes -> rejudge -> score`
までを固定順で閉じる。

対象レーン:

- `K1_TRACE_EMPTY_GATED_V1`
- `TENMON_CONCEPT_CANON_V1`
- `SCRIPTURE_LOCAL_RESOLVER_V4`

## 固定順

1. `TENMON_K1_SCRIPTURE_BIND_REHYDRATION_CURSOR_AUTO_V1`
2. `TENMON_CONCEPT_CANON_CENTER_BIND_REHYDRATION_CURSOR_AUTO_V1`
3. `TENMON_SCRIPTURE_LOCAL_RESOLVER_TOC_SUPPRESS_CURSOR_AUTO_V1`
4. `TENMON_WEAK_ROUTE_3LANE_REHYDRATION_ACCEPTANCE_CURSOR_AUTO_V1`

## 実装

- `api/automation/tenmon_weak_route_3lane_rehydration_parent_v1.py`
- `api/scripts/tenmon_weak_route_3lane_rehydration_parent_v1.sh`

## 実行契約

- routeReason 契約は不変
- `dist/` 直編集禁止
- 1 card = 1 主修復
- success 捏造禁止
- `lawsUsed` / `evidenceIds` は空なら空のまま
- halt 時は retry 1枚のみ生成

## acceptance

- K1 で sourcePack / thoughtGuide / notion 再水和の観測がある
- CONCEPT で centerMeaning null の残差が減衰する
- `SCRIPTURE_LOCAL_RESOLVER_V4` で目次 bleed が抑止される
- score / rejudge / selector が新 truth に追従する

## nextOnPass

`TENMON_OVERNIGHT_CONTINUITY_OPERABLE_PDCA_ORCHESTRATOR_CURSOR_AUTO_V1`

## nextOnFail

停止。retry 1枚のみ。

