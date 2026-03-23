# AUTO_BUILD_MAINLINE_REGISTRY_REPAIR_V1

## 目的

`card_catalog_v1.json` / `card_dependency_graph_v1.json` と patch planner → generator → cursor bridge/applier の **targetCard** を主線 FINAL カードへ同期する（`chat.ts` 本体は編集しない）。

## 範囲

- automation / reports / generated manifests / constitution のみ

## 次カード

`CHAT_TRUNK_SUPPORT_SELFDIAG_SPLIT_V1_FINAL`

## 備考

- `full_autopilot_v1.py` の `runNext.nextCard` は、patch planner の `recommendedNextCard` を起点にカタログ `nextOnPass` へ進め、キュー上 `completed` のカードをスキップする。運用上 **provisional pass** の scripture / continuity はコード内 `_PROVISIONAL_MAINLINE_PASS` で完了扱いにし、主線の表示先頭を `CHAT_TRUNK_SUPPORT_SELFDIAG_SPLIT_V1_FINAL` に揃えられる。
