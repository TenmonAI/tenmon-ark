# KHS_EDGE_POLICY_v1.md
# Purpose: edges（関係＝シナプス）を“推測”ではなく“根拠付き宣言”のみで増殖させる契約。
# Scope: khs_edges / relations の生成条件、edgeType語彙、必須フィールド、監査ルール。
# Non-negotiables: 推測edge禁止 / evidenceUnitId必須 / 1変更=1検証 / 中枢D汚染禁止

## 0) edgesの位置づけ
- edgesは「意味の推論」ではない。
- edgesは「本文が宣言した関係」を固定する“配線記録”である。
- よって、宣言根拠（Unit）が無い edge は作らない。

## 1) edgeType（固定語彙）
許可するedgeTypeは以下のみ。追加はカード化して封印。

- SUPPORTS（支える）
- REFUTES（否定・矛盾）
- REQUIRES（前提）
- DERIVES（派生）
- EXPLAINS（説明）

※ “LIKES”“RELATED”など曖昧語彙は禁止（濁り源）。

## 2) 生成してよい条件（必要十分）
edgeを生成してよいのは、次のいずれかの **宣言Unit** が存在する場合のみ。

### 2.1 宣言Unitの型（type）
- MAP（対応表・一覧・所属宣言）
- LAW（関係を明示する原理）
- RULE（禁則としての関係：AはBを禁ず 等）
- QUOTE（規範文で関係が明示されている）

### 2.2 宣言の要件（本文上の明示）
- AとBが、本文上で「対応/対/属/生ず/要す/反す」等として **明示**されている
- その明示箇所が unitId として切り出されている
- その unitId を evidenceUnitId として edge に付与できる

曖昧なら edge を作らない（必要ならGATEへ）。

## 3) edgeレコードの必須フィールド（DB/JSON共通）
### 3.1 DB想定（khs_edges）
- edgeId: "KHSE:<fromKey>-><toKey>:<edgeType>"
- fromKey: termKey または lawKey（どちらか明示）
- toKey: termKey または lawKey
- edgeType: 固定語彙
- evidenceUnitId: 必須（宣言Unit）
- status: proposed|verified|rejected
- createdAt: timestamp

### 3.2 JSON想定（relations）
```json
{
  "relType": "SUPPORTS|REFUTES|REQUIRES|DERIVES|EXPLAINS",
  "targetKey": "<termKey|lawKey|setKey>",
  "targetKind": "term|law|set",
  "evidenceUnitId": "<unitId>"
}