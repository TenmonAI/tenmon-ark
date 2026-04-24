# CARD-MC-16-V2 — Context injection effect audit

## 目的

`/api/chat` の GEN_SYSTEM 周辺で組み立てられる深層注入（言霊秘書・いろは・五十連・統合音・天照軸・truth 軸・言霊 connector）の **メタデータ** と、実際の応答本文（長さ・キーワード・2-gram Jaccard 多様性）の関係を JSON に集計する。LLM プロンプト本文や JSON レスポンス形状は変更しない。

## 前提

1. API プロセスに `TENMON_MC_DEBUG_INJECTION_ENDPOINT=1` を設定する（未設定時は `/api/mc/vnext/debug/last-injection` が 404 で観測できない）。
2. `TENMON_MC_CLAUDE_READ_TOKEN` をスクリプト実行環境に渡す（vNext GET レーン）。ファイルから読む場合は `MC16V2_TOKEN_FILE=/path/to/secret.txt`（先頭行のみ）。
3. vNext が有効（従来どおり `TENMON_MC_VNEXT` 等）。

## 実行

```bash
cd /opt/tenmon-ark-repo/api
export TENMON_MC_DEBUG_INJECTION_ENDPOINT=1
export TENMON_MC_CLAUDE_READ_TOKEN='…'
export MC16V2_API_URL='http://127.0.0.1:3000'   # 省略時はこの URL
node automation/mc16v2_context_injection_audit.mjs
```

成果物: `automation/out/mc16v2_context_injection_audit.json`

## 出力の読み方（要約）

- `per_question_analysis[].response_jaccard_similarity` — 同一質問 3 応答の平均 2-gram Jaccard。高いほど定型に近い。
- `injection_stats.*.appearance_correlation` — サンプル 3 の Pearson（分散ゼロ時は `null`）。絶対値が小さいときは「痕跡が読みにくい」。
- `overall.truth_axis_observed_prompt_injected` — 現行実装では truth 軸句は GEN_SYSTEM に連結されていない（観測のみ）旨の固定メモ。
- `recommendation` — `kotodamaOneSoundLawIndex` の本配線・truth 軸配線など次カード候補。

## production

既定ではデバッグ GET は **無効**（環境変数が `1` のときだけ有効）。本番で観測が不要なら設定しない。

## REVERT

カード指示どおり、`contextInjectionProbe.ts`・`chat.ts` の probe 呼出・本スクリプト・README を削除し API を再起動する。
