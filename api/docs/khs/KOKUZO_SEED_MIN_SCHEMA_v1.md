# KOKUZO_SEED_MIN_SCHEMA_v1.md
# Purpose: Kokūzōにおける「FractalSeed（構文核）」の最小JSONスキーマ（DBに入れる形）
# Design goals: Π↑(追跡可能性) / ΔZ↓(混入遮断) / I_A↑(再現性) / Φ↑(再利用価値)
# Non-negotiables: 推測禁止 / verifiedのみ中枢 / UNRESOLVED隔離 / doc/pdfPage実在 / 1変更=1検証

## 0) Seedの定義（最小）
Seedとは「要約」ではない。
- evidence（根拠 Unit）と
- laws（適用された verified Law）と
- trace（適用経路の再現ログ）
を束ねた “再現可能な構文核” である。

## 1) DB格納方針（2層）
- DB列: seedId / ownerId / createdAt / status / metaJson
- metaJson: 下記スキーマの JSON（固定）

## 2) metaJson スキーマ（最小）
### 2.1 JSON Schema（概念仕様）
必須：seedは「どの根拠」「どの法則」「どの適用ログ」から生まれたかを失わない。

```json
{
  "schema": "KOKUZO_SEED_MIN_V1",
  "seedId": "KZSEED.<hash8>",
  "ownerId": "USER.<id>",
  "createdAt": "2026-02-23T00:00:00Z",
  "status": "proposed|verified|quarantined",

  "inputs": {
    "sourceDocs": [
      "doc=NOTION:PAGE:<id>",
      "doc=NAS:PDF:<name>:<hash>"
    ],
    "sourceScope": "KHS_CORE|KHS_MAP|EXTERNAL_MAP",
    "query": "optional: user message or ingestion goal",
    "threadId": "optional",
    "turnId": "optional"
  },

  "core": {
    "evidenceUnitIds": ["KHSU:...", "KHSU:..."],
    "lawKeys": ["KHS:LAW:...", "KHS_ICHIGEN.<termKey>"],
    "applyIds": ["KHSAP:thread:turn:lawKey", "..."],

    "profiles": {
      "truth_axis": {
        "cycle": 0,
        "polarity": 0,
        "center": 0,
        "breath": 0,
        "carami": 0,
        "order": 0,
        "correspondence": 0,
        "manifestation": 0,
        "purification": 0,
        "governance": 0
      },
      "kanagi_phase": {
        "L-IN": 0,
        "L-OUT": 0,
        "R-IN": 0,
        "R-OUT": 0
      }
    }
  },

  "quality": {
    "pi_traceability": 0.0,
    "z_turbidity": 0.0,
    "phi_value": 0.0,
    "ia_stability": 0.0,
    "notes": []
  },

  "guardian": {
    "isCoreAligned": true,
    "quarantineReasons": [],
    "unresolvedRefs": []
  }
}