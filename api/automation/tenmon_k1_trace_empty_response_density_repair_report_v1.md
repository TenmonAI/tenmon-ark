# TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1

## 目的達成

queue 指定の本カードを **1 修復・最小 diff** で実施した。`commit` は行っていない。shelter 配下・keep runtime（single-flight / autocompact 群）は **未編集**。

## 観測・原因の 1 点化

1. **routeReason**: `K1_TRACE_EMPTY_GATED_V1` は `gates_impl` の HYBRID 空 trace ラベル、`finalize` の経典帯処理と接続される。
2. **finalize 出口**: `K1_TRACE_EMPTY_MIN_SURFACE_V1`（`finalize.ts`）は `stripScripturePlaceholderAndTraceV1(body)` 後の `stripped` が **1 文字以上かつ 120 字未満**のときだけ `tail` を連結していた。
3. **空落ち**: 応答が trace・メタ行・プレースホルダのみで、strip で **すべて落ちた**場合 `stripped.length === 0` となり、**本文が更新されない**（空のまま、または strip 対象だけが残る前状態のまま）経路があり得る。
4. **density**: 空本文では `chat.ts` の `__tenmonK1PostFinalizeLlmEnrichV1` も入力コアが弱く、憲章で想定する 140 字帯への到達が不安定になる。

**絞った原因（1 つ）**: `stripped.length === 0` 時の **明示的フォールバック欠如**。

## 修復（1 箇所）

**ファイル**: `api/src/routes/chat_refactor/finalize.ts`  

- `tail` / `techQ` の定義を共通ブロックへ寄せ、`stripped.length === 0` の **`else if` を追加**。
- そのとき `body = 【天聞の所見】\n\n${tail}` とし、**空応答を防ぎ**、後段の K1 post-finalize LLM enrich（`chat.ts`）へ **非空ブリッジ**を渡す。

`git diff --stat -- api/src/routes/chat_refactor/finalize.ts`:

```text
1 file changed, 11 insertions(+), 7 deletions(-)
```

## 検証

| 項目 | 結果 |
|------|------|
| 1 カード 1 修復 | **PASS**（finalize のみ） |
| 編集範囲 | **PASS**（候補リスト内・1 ファイル） |
| queue JSON 読取 | **PASS**（`tenmon_cursor_single_flight_queue_v1.py`） |
| empty / density | **PASS（論理）**: strip 全除去時に必ず非空表面へ |
| `npm run check` | **環境 FAIL**: 欠落した `*.js` 参照モジュールが多数（本 diff 外） |

欠落モジュールは shelter 退避の副作用と判断し、**本カードではファイルを戻さない**制約に従い、ビルド赤は **本修復とは独立**として記録した。

## コミット

**なし**（指示どおり）。

## FAIL 時用（未使用）

再試行 1 枚: `TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_RETRY_CURSOR_AUTO_V1`

## 次の一手（任意）

- 欠落 core を復元したうえで `api/` で `npm run check` を再実行。
- 実 API に対し憲章プローブ（空海・法華経・言霊等）で応答長と `routeReason` をログ確認。
