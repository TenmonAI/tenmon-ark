# TENMON_CHAT_ARCHITECTURE_OBSERVER_V1

## 目的

`chat.ts`（および `chat_refactor/*.ts` の trunk 一覧）を **読み取り専用**で観測し、構造劣化の再発検知に使う **機械可読な観測束**を出力する。

## 成果物

| 種別 | パス |
|------|------|
| 実装 | `api/automation/chat_architecture_observer_v1.py` |
| スキーマ | `api/automation/chat_architecture_observer_schema_v1.json` |
| VPS シェル | `api/scripts/chat_architecture_observer_v1.sh` |
| 後方互換ラッパー | `api/automation/tenmon_chat_architecture_observer_v1.py` |

## 必須 10 項目（ルート JSON）

1. `line_count`  
2. `import_count`  
3. `route_reason_unique_count`  
4. `threadCore_count`  
5. `responsePlan_count`  
6. `synapse_count`  
7. `hot_windows` — `start_line` / `end_line` / `hit_terms[]` / `heat_score`  
8. `duplicate_responsibility` — 層別行集合の **重複行** とペア集計  
9. `trunk_wiring` — 各 trunk の `exists` / `imported` / `mentioned` / `likely_unwired`  
10. `surface_bleed_points` — `noise_literal` / `generic_preamble` / `helper_tail` と行・抜粋  

加えて planner 互換: `surface_bleed_score`, `route_drift_score`, `giant_file`, `signals`。

## VPS 出力（`--out-dir`）

- `chat_architecture_report.json`
- `hot_windows.json`
- `trunk_wiring_report.json`
- `surface_bleed_points.json`
- `final_verdict.json`（`observer_pass`）
- `chat_architecture_observation.json`（レポートと同一・runner/planner 用）

## 実行例

```bash
export CARD=TENMON_CHAT_ARCHITECTURE_OBSERVER_VPS_V1
/opt/tenmon-ark-repo/api/scripts/chat_architecture_observer_v1.sh
```

サンプル（chat.ts 非読）:

```bash
export CHAT_ARCH_OBSERVER_SAMPLE=1
```

## 編集境界

**触らない:** `dist/**`, DB, kokuzo 正文, systemd env, **chat.ts / route / response surface の実装改変**。

## カード

- `TENMON_CHAT_ARCHITECTURE_OBSERVER_CURSOR_AUTO_V1`
- `TENMON_CHAT_ARCHITECTURE_OBSERVER_VPS_V1`
- `TENMON_CHAT_ARCHITECTURE_OBSERVER_RETRY_CURSOR_AUTO_V1`
