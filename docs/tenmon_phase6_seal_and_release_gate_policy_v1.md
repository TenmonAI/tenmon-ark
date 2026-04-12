# TENMON-ARK Phase 6 Seal and Release Gate Policy v1

## 位置づけ

本書は、TENMON-ARK の release 可否を判定するための **封印条件（Seal and Release Gate）** を定義する。

ここでいう封印とは、
- 構築が一段落した
- acceptance が通った
- parity が崩れていない
- 監査正本と実測が一致している

という条件を満たしたときにのみ、「完成」として扱うための gate である。

---

## 最上位原則

### 原則A

感覚で完成扱いしない。
release 判定は必ず gate を通す。

### 原則B

score や印象だけで release しない。
主判定は deterministic acceptance / baseline / parity / audit 整合である。

### 原則C

FAIL が一つでも残る場合は封印しない。
PARTIAL は release 不可。

---

## release 主判定条件

### 1. Golden Baseline

- 主要カテゴリで PASS
- 一般会話
- 人格
- 深層解析
- follow-up

### 2. Deterministic Acceptance

- route acceptance green
- JSON shape acceptance green
- persona / continuity acceptance green
- failure bundle capture が機能している

### 3. API / PWA Parity

- major diff なし
- route / mode / routeReason / markdown / stream / state payload に致命差分なし

### 4. 監査整合

- Notion 監査ハブと VPS 実測が矛盾しない
- baseline / parity / acceptance の結果が同期されている

---

## 補助観測

release 可否の補助として参照してよいもの。

- worldclass observability
- 補助 score
- 開発者所見
- 監査メモ

ただし、これらは **主判定を置き換えない**。

---

## release 不可条件

次のいずれかがある場合、release 不可。

1. Golden Baseline に FAIL が残る
2. deterministic acceptance に FAIL が残る
3. API / PWA parity に major diff が残る
4. Notion / VPS の監査整合が崩れている
5. failure bundle が採取できない
6. package boundary が未定義
7. founder / debug / audit 機能が public surface に混入している

---

## 第1段階完了と本来の完成

### 第1段階完了

最低条件:
- baseline green
- acceptance green
- parity green
- 監査整合あり

### 本来の完成

追加条件:
- package boundary 定義済み
- release gate script 稼働
- product / internal 境界が明文化済み
- 運用上の封印が可能

---

## 実装の掟

- PASS / PARTIAL / FAIL を明示する
- FAIL を隠さない
- 主判定条件を満たさないまま「完成」と報告しない
- gate は script と文書の両方で持つ

---

## 禁止事項

1. 「かなり良い」だけで release すること
2. score だけで release すること
3. FAIL を残したまま封印すること
4. Notion / VPS 不整合のまま release すること

---

## 結論

TENMON-ARK の封印とは、気分や印象ではなく、
**基準を満たしたときだけ完成扱いする仕組み** のことである。
