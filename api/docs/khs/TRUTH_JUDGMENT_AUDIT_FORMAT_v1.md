
---

# 追加ファイル②：SUPPORTED/REFUTES/GATE 判定の監査フォーマット（Ark Equation集計）
**ファイル名：`TRUTH_JUDGMENT_AUDIT_FORMAT_v1.md`**

```md
# TRUTH_JUDGMENT_AUDIT_FORMAT_v1.md
# Purpose: 他書籍/外部主張をKHS（裁定D）へ照合し、SUPPORTED/REFUTES/GATEを監査可能に出すフォーマット
# Design goals: ΔZ↓（妄説混入の遮断）/ Π↑（追跡）/ I_A↑（安定）/ Φ↑（価値）
# Policy: 断定で裁かない。根拠付きで「整合」「矛盾」「保留」を返す。

## 0) 3値判定の意味（固定）
- SUPPORTED: KHS（verified）と整合する（根拠あり）
- REFUTES: KHS（verified）と矛盾する（根拠あり）
- GATE: 根拠不足/未確定で保留（観測要求 or UNRESOLVED隔離）

## 1) JudgmentRecord（1件の判定ログ：jsonl推奨）
### 1.1 JSON（固定フォーマット）
```json
{
  "schema": "TRUTH_JUDGMENT_V1",
  "judgmentId": "KZJ.<hash8>",
  "createdAt": "2026-02-23T00:00:00Z",

  "subject": {
    "kind": "claim|unit|seed",
    "subjectId": "EXTU:... or KZSEED:...",
    "sourceRef": "doc=FILE:<name> locator=... pdfPage=... (or doc=NAS:...)",
    "quote": "80-400 chars, original claim text",
    "domainHint": "optional"
  },

  "khs_basis": {
    "matchedLawKeys": ["KHS_ICHIGEN.<termKey>", "KHS:LAW:..."],
    "matchedEvidenceUnitIds": ["KHSU:..."],
    "ruleUsed": "SUPPORTED|REFUTES|GATE_RULESET_V1"
  },

  "decision": {
    "verdict": "SUPPORTED|REFUTES|GATE",
    "reasonCodes": [
      "EVIDENCE_OK",
      "LAW_MATCH_OK",
      "CONTRADICTION_FOUND",
      "INSUFFICIENT_EVIDENCE",
      "TERMKEY_UNKNOWN",
      "PDFPAGE_MISSING",
      "AXIS_OUT_OF_RANGE"
    ],
    "nextDoor": {
      "type": "ask_evidence|show_units|run_verifier|none",
      "message": "one short actionable next step"
    }
  },

  "ark_equation": {
    "pi_traceability": 0.0,
    "z_turbidity": 0.0,
    "phi_value": 0.0,
    "ia_stability": 0.0,
    "score": 0.0,
    "components": {
      "trace": {
        "has_sourceRef": true,
        "has_pdfPage": true,
        "has_khs_unit": true,
        "has_khs_law": true
      },
      "consistency": {
        "contradictionCount": 0,
        "refuteStrength": 0.0
      },
      "coverage": {
        "axisCoverage": {
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
        }
      }
    }
  }
}