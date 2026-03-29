# TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_REPORT_V1

- **card**: `TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_CURSOR_AUTO_V1`
- **実装**: `api/src/core/katakamunaLineageTransformationEngine.ts`
- **再エクスポート**: `api/src/core/lineageAndTransformationJudgementEngine.ts`（既存 `judgeLineageAndTransformationV1` の挙動は不変）
- **JSON**: `api/automation/tenmon_katakamuna_lineage_and_transformation_result_v1.json`

## 1. lineage layer（誰から誰へ）

各エッジに保持: `source_person`, `target_person`, `medium`, `transmission_role`, `historical_certainty`（`placeholder` は NAS 確証待ち）。

- 資料原層 → **楢崎皐月**（体系化の受け皿）
- **楢崎** → 相似象系（構造分岐）
- **楢崎** → **宇野多美恵**（普及・二次説明。**本流の単線延長として断定しない**）
- 普及バケット → 吉野・板垣等（二次以降）
- → **TENMON-ARK**（再統合・境界）

## 2. transformation layer（どう変わったか）

各ステージに保持: `doctrinal_shift`, `interpretation_shift`, `life_advice_shift`, `healing_shift`, `spirituality_shift`, `mythic_expansion_shift`（**史実 certainty とは別欄**）。

- **宇野段** (`stage_uno_popularization`): 一般向け圧縮・比喩増・生活/癒し/スピ語彙の増圧（可能性として記述）。タグ **`普及`** のみ（本流と混線禁止）。
- **川ヰ段**: **`普及` + `心理化`**
- **神秘化市場**: **`神秘化` + `普及`**
- **天聞再統合**: **`再統合`**

## 3. divergence tags

| タグ | 用途 |
|------|------|
| 本流 | 系譜・注釈・原層スロット（監査 id に紐づけ） |
| 普及 | 宇野以降・バケット |
| 生活化 | バケット等 |
| 心理化 | 川ヰ系など |
| 神秘化 | 市場層 |
| 再統合 | TENMON 内部束 |

`divergence_map` は `katakamunaSourceAuditClassificationV1` の各 `id` → タグ配列。

## 4. 出力フィールド（bundle）

- `lineage_summary` / `transformation_summary`
- `lineage_edges` / `transformation_stages`
- `divergence_map`
- `unresolved_points`

## 次カード

- **nextOnPass**: `TENMON_KATAKAMUNA_TENMON_REINTEGRATION_AND_BOUNDARY_BIND_CURSOR_AUTO_V1`
- **nextOnFail**: `TENMON_KATAKAMUNA_LINEAGE_AND_TRANSFORMATION_ENGINE_RETRY_CURSOR_AUTO_V1`
