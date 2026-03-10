# Canon Gap Report v1

このレポートは、`scripture_learning_ledger` に記録された会話ログから、まだ canon / subconcept / thought guide / persona constitution へ十分に取り込まれていない問いを抽出し、今後の schema 強化候補として整理したものです。

## 1. 集計対象

- **ソースDB**: `/opt/tenmon-ark-data/kokuzo.sqlite`
- **テーブル**: `scripture_learning_ledger`
- **抽出条件**（`mineCanonGaps()` 実装準拠）:
  - `resolvedLevel = 'general'`
  - かつ `unresolvedNote` が非空、または `message` に「〜とは」「〜って何」を含む
  - かつ `scriptureKey IS NULL AND subconceptKey IS NULL AND conceptKey IS NULL`

2026-03-10 時点のサンプルでは、代表的な `general` レコードとして次が確認されています:

```text
routeReason: NATURAL_GENERAL_LLM_TOP
message    : この件をどう整理すればいい？
resolvedLevel: general
```

## 2. 抽出結果サマリ（カテゴリ別）

現状の ledger では、`concept` / `verified` / `scripture` / `subconcept` は既に専用ルートで解決されており、`general` に残っている代表ケースは少数です。`mineCanonGaps()` による分類ルールは次の4カテゴリです:

- **scripture_candidate**
  - カタカムナ / 言霊秘書 / イロハ言灵解 など明示的な正典語を含みつつ、`resolvedLevel='general'` に留まっている問い。
- **subconcept_candidate**
  - 「アとは？」「ヒとは？」「ウタヒとは？」のような一音・ウタヒ系の下位概念が `general` のまま残っている問い。
- **thought_guide_candidate**
  - 「どう整理すればいい？」「どう考えればいい？」といった meta-level の整理 / 思考案内の問いが、まだ thought guide canon ではなく general で処理されているもの。
- **persona_candidate**
  - 「人格」「キャラクター」「立場」など persona / stance に直接言及しているが、general で処理されている問い。

## 3. 代表ギャップ例

### 3.1 scripture_candidate: 「言霊とは何ですか？」

- **message**: 「言霊とは何ですか？」
- **routeReason**: `DEF_FASTPATH_VERIFIED_V1`
- **lastResolvedLevel**: `verified`
- **why**:
  - verified 定義と KHS 根拠には乗っているが、言霊秘書DB / 五十音一言法則 / 五十連十行 / 水火伝 / イロハ口伝との横断がまだ浅い。
  - scripture canon / subconcept canon / thought guide を跨いだ「言霊レイヤー」の束ね方を、別スキーマとして固定する余地がある。

### 3.2 scripture_candidate: 「カタカムナとは何ですか？」

- **message**: 「カタカムナとは何ですか？」
- **routeReason**: `KATAKAMUNA_CANON_ROUTE_V1`
- **lastResolvedLevel**: `concept`
- **why**:
  - concept canon と KATAKAMUNA_CANON_ROUTE_V1 で一定の深度はあるが、カタカムナ言灵解・楢崎本流・空海軸・山口志道・稲荷古伝・天津金木を束ねた scripture 層はまだ薄い。
  - 「どの原典から入るか」「どの枝を避けるか」を explicit に制御する scripture canon があれば、generic drift をさらに抑えられる。

### 3.3 persona_candidate: 「この件をどう整理すればいい？」

- **message**: 「この件をどう整理すればいい？」
- **routeReason**: `NATURAL_GENERAL_LLM_TOP`
- **lastResolvedLevel**: `general`
- **why**:
  - 整理に関する meta-level の問いであり、本来は thought guide 軸（support / organize）＋ persona 憲法の judgementDiscipline（本質→位置づけ→原典接続→次軸）を明示的に噛ませたい。
  - 現状は general deterministic の断捨離スタイルで返しており、ledger 上では他 canon との結線が（まだ）明示されていない。

## 4. 今後の強化ポイント

現時点の ledger では、以下が確認できます:

- **concept / verified / scripture / subconcept**:
  - `カタカムナとは何ですか？` → `KATAKAMUNA_CANON_ROUTE_V1 | concept`
  - `言霊とは何ですか？` → `DEF_FASTPATH_VERIFIED_V1 | verified`
  - `言霊のアとは？` → `TENMON_SUBCONCEPT_CANON_V1 | subconcept`
- **general**:
  - `この件をどう整理すればいい？` → `NATURAL_GENERAL_LLM_TOP | general`

このため、gap miner の初期段階では:

- **scripture_candidate / subconcept_candidate** は、既に専用ルートへ昇格済み（ギャップ少）。
- **thought_guide_candidate / persona_candidate** に、今後の強化余地が集中している、と判断できます。

## 5. 次カード候補

- `R9_SELF_GROWTH_LOOP_V1`
  - ledger に蓄積された `general` 系 thought_guide_candidate / persona_candidate を定期的に走査し、
    - thought guide schema
    - persona constitution
    への反映案を自動生成する「自己成長ループ」を設計する。
