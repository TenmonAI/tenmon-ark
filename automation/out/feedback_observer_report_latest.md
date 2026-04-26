# TENMON-ARK feedback observer (Phase 1)

- generated_at: `2026-04-26T02:32:20.048889+00:00`
- observer_version: `v1.0.0-phase1`
- verdict: **YELLOW**
- summary: critical=0 / warn=1 / info=2

## 1. DB (kokuzo.sqlite, mode=ro)

- tables_found (0): (none)

## 2. Notion (read-only)

- token_present: True
- feedback DB (id_sha8=`b872d24a`): row_count=20 has_more=True
  - `未解析` | created=2026-04-23T00:17:00.000Z | sha8=35fd6ff0 | title=チャットでの質問の回答が途中までしか出てこない
  - `未解析` | created=2026-04-22T13:08:00.000Z | sha8=103c9603 | title=チャット欄
  - `未解析` | created=2026-04-22T09:59:00.000Z | sha8=3d75f8ff | title=聞いた答えが途中で途切れる
  - `未解析` | created=2026-04-22T05:40:00.000Z | sha8=78ff8af7 | title=チャットの途中で文章が終わる
  - `未解析` | created=2026-04-21T15:21:00.000Z | sha8=a2e0a8e6 | title=回答がかなり短く途切れます
  - `未解析` | created=2026-04-21T09:33:00.000Z | sha8=ce82e70c | title=上部タブのメニュー表示について
  - `未解析` | created=2026-04-20T17:53:00.000Z | sha8=ea4062fd | title=よくチャット内容が途中で切れる
  - `未解析` | created=2026-04-20T16:59:00.000Z | sha8=b98a00c9 | title=チャットの回答が途中で切れる
  - `未解析` | created=2026-04-20T10:35:00.000Z | sha8=ab915016 | title=チャットで「宿曜鑑定で深掘りしたい」をクリックすると
  - `未解析` | created=2026-04-20T09:59:00.000Z | sha8=9c610d83 | title=チャットのやり取りでメッセージが最後まで表示されない
  - `未解析` | created=2026-04-20T08:41:00.000Z | sha8=e71a3152 | title=写真の解析など
  - `未解析` | created=2026-04-19T21:49:00.000Z | sha8=9c0072f8 | title=チャットの返答が途切れる。簡単な言葉で続きを求めると、はじめから説明しないと答えられない。
  - `未解析` | created=2026-04-18T15:24:00.000Z | sha8=8643b1a8 | title=回答が途中で途切れます
  - `未解析` | created=2026-04-18T14:49:00.000Z | sha8=7b39ee71 | title=考え方や答え方のプロセスまで出ていました。
  - `未解析` | created=2026-04-18T12:01:00.000Z | sha8=643a7642 | title=改行を押すとそのまま送信になる
  - `未解析` | created=2026-04-18T10:56:00.000Z | sha8=b939d908 | title=質問への回答が途中で切れる
  - `未解析` | created=2026-04-18T10:37:00.000Z | sha8=be19b8f5 | title=チャットの応答の途中で途切れる
  - `未解析` | created=2026-04-17T13:43:00.000Z | sha8=c0afb2b7 | title=鑑定の時に途中で終わってしまう
  - `未解析` | created=2026-04-17T08:15:00.000Z | sha8=3586309b | title=スマホでリターンで改行
  - `未解析` | created=2026-04-17T00:57:00.000Z | sha8=2cf9779f | title=宿曜鑑定における「宿分類と実際の状態の乖離」について
- task DB (id_sha8=`829fe95a`): row_count=20 has_more=True
  - `pending`: 18
  - `hold`: 2

## 3. API endpoints (READ-ONLY)

- `https://tenmon-ark.com/api/feedback/history`: status=200 row_count_if_any=46
- `https://tenmon-ark.com/api/feedback/list`: status=404 row_count_if_any=None
- `https://tenmon-ark.com/api/founder/requests`: status=404 row_count_if_any=None

## 4. Classification

- total_observed: 20
  - chat_quality: 8
  - knowledge: 2
  - ui: 2
  - tone: 0
  - performance: 0
  - bug: 0
  - other: 8

## 5. Card candidates (suggestion only — no auto-generation)

- chat_quality 8 件 → `CARD-CHAT-QUALITY-OBSERVE-V1` 候補
- knowledge 2 件 → `CARD-KNOWLEDGE-COVERAGE-OBSERVE-V1` 候補
- ui 2 件 → `CARD-UI-USABILITY-OBSERVE-V1` 候補

## 6. Loop health

- evolution_entries: 8
- commits_last_7d: 56
- doctor_v2_last_verdict: YELLOW

## Findings

- [warn] [db] no feedback-related tables found in kokuzo.sqlite
- [info] [api] https://tenmon-ark.com/api/feedback/list not found (404)
- [info] [api] https://tenmon-ark.com/api/founder/requests not found (404)

