# SANSKRIT_RULE_INDEX_V1

**MODE:** `DOCS_ONLY`（本カードの **runtime 実装・DB DDL は含まない**）  
**データ正本（機械可読）:** `api/data/sanskrit/sanskrit_rule_index_v1.json`  
**上位文書:** `SELF_BUILD_GOVERNOR_V1.md`  
**前提:** `SANSKRIT_KOTODAMA_SOURCE_IMPORT_V1`（source 層・page anchor）  
**no-touch:** `api/src/db/kokuzo_schema.sql`

---

## 1. 目的

**Classical Sanskrit** の規範文法ルールを、後段の照会・検証に耐える形で **索引化**するための論理契約を固定する。  
神秘解釈へのジャンプを禁止し、**形態・接続・複合**の観測を先に置く。

---

## 2. 索引の範囲（対象カテゴリ）

| カテゴリ | 意味（観測上） |
|----------|----------------|
| **sandhi** | 音の接続・統合規則 |
| **prefix** | 接頭辞・前置の運動（語形成上の位置づけ） |
| **morphology** | 語形変化（活用・派生など） |
| **compound** | 複合語の結合と中心 |
| **examples** | 例示（出典・ページアンカーに紐づく） |

---

## 3. エントリの最低フィールド（論理）

JSON 内の各 `entries[]` は少なくとも次を持つ（名前は実装で調整可）。

- `rule_id` — 安定 id  
- `category` — 上表のいずれか  
- `title` — 人間可読の短名  
- `source_id` — `sanskrit_kotodama_sources_v1.json` の **classical_sanskrit** 系と対応  
- `page_anchor` — `{source_id}#p{n}` 形式（物理ページ 1 始まり）  
- `summary` — 一文での観測要約（断定過多禁止）

---

## 4. BHS との関係

本索引は **古典サンスクリット規範**を主とする。**BHS** は別索引（将来カード）で扱い、混在エントリを作らない。

---

## 5. 受入条件（本カード）

- カテゴリとエントリ最低フィールドが明確。  
- **docs + data** で完結し、`chat.ts` を変更しない。  
- **kokuzo_schema.sql** を触らない。

---

## 6. 次カード候補（1 つのみ）

`KOTODAMA_RULE_INDEX_V1`

---

## 7. 変更履歴

| 版 | 内容 |
|----|------|
| V1 | 論理契約と JSON スキーマ骨格を固定 |
