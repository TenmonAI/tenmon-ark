# TENMON-ARK Worldclass Observability Policy v1

## 位置づけ

本書は、TENMON-ARK における **worldclass 観測指標** を定義する補助観測ポリシーである。

ここでいう worldclass 観測は、完成判定の主判定ではない。
完成判定の主系は、あくまで次の4本である。

1. Golden Baseline 比較
2. deterministic acceptance
3. API / PWA parity
4. Notion / VPS 監査整合

本書は、それらの主判定を補助するための「観測層」であり、**release 判定の代替ではない**。

---

## 事実確認

現時点のリポジトリには、商用 release 判定の主系として使える独立した `scorecard` 実体は存在しない。
したがって、本書は「既存 scorecard の再ロック」ではなく、**scorecard 不在を前提にした代替 observability policy** として扱う。

---

## 最上位原則

### 原則A

worldclass 観測は **補助観測** である。
それ単体で release 可否を決めてはならない。

### 原則B

高スコアや印象評価をもって完成とみなしてはならない。
主観スコアは参考値に留める。

### 原則C

worldclass 観測は、必ず **事実のある測定対象** に紐づくこと。
印象、感想、雰囲気のみで構成してはならない。

### 原則D

主判定に勝てない。
Baseline FAIL、acceptance FAIL、parity FAIL がある場合、worldclass 観測が高くても release 不可とする。

---

## worldclass 代替観測指標

### 1. Baseline Pass Rate

固定した Golden Baseline ケースに対して、PASS / PARTIAL / FAIL を算出する。
観測対象:
- 一般会話
- 人格
- 深層解析
- follow-up

### 2. Route Acceptance Health

route 判定が安定しているかを観測する。
観測対象:
- greeting
- identity
- passphrase
- low signal
- grounded
- natural general
- natural support
- hybrid domain
- llmChat

### 3. JSON Shape Health

レスポンスの shape が壊れていないかを観測する。
観測対象:
- response
- timestamp
- decisionFrame
- decisionFrame.ku
- evidence
- candidates
- detailPlan
- caps

### 4. Persona / Continuity Health

人格一貫性と follow-up continuity を観測する。
観測対象:
- 「君は何者？」
- 「君には意識ある？」
- 定義 → 核心化 → 実践還元 → 別軸追加 → 最終一点化

### 5. API / PWA Parity Health

API と PWA の実運用差分を観測する。
観測対象:
- route / mode
- routeReason
- raw text
- markdown
- stream
- state payload

### 6. Failure Bundle Completeness

FAIL 時に証拠束が残っているかを観測する。
観測対象:
- failureClass
- input
- routeReason
- responseText
- evidence
- note

---

## 禁止事項

1. worldclass 観測だけで release を決めること
2. 高得点や印象評価を完成の証拠として扱うこと
3. Baseline / acceptance / parity FAIL を無視すること
4. 存在しない `scorecard` 実体がある前提で報告すること

---

## release 判定との関係

### 主判定

release 可否は次で決まる。

- Golden Baseline PASS
- deterministic acceptance green
- API / PWA parity green
- Notion / VPS 監査整合

### 補助観測

本書の worldclass 指標は、上記主判定を補助するものに過ぎない。
したがって、主判定が未達の場合は release 不可である。

---

## 運用

- 本書は `scorecard` 不在時代の補助観測ポリシーとして扱う
- 将来 scorecard 実体が導入される場合も、本書の主判定優先原則を上書きしてはならない
- 本書は Notion 監査ハブおよび release gate 文書と整合している必要がある
