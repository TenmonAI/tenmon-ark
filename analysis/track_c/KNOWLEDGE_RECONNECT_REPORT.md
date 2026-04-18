# TENMON_KNOWLEDGE_RECONNECT_V1 — 調査結果

## 1. データ資産の所在確認（全8ファイル存在確認済み）

| # | ファイル | サイズ | 場所 | 状態 |
|---|---------|--------|------|------|
| 1 | soundMeanings.json | 23KB | api/src/kanagi/patterns/ | CONNECTED (knowledgeLoader.ts) |
| 2 | amatsuKanagi50Patterns.json | 37KB | api/src/kanagi/patterns/ | CONNECTED (knowledgeLoader.ts) |
| 3 | katakamuna80.json | 27KB | shared/katakamuna/ | CONNECTED (knowledgeLoader.ts + server/katakamuna.ts) |
| 4 | EVIDENCE_UNITS_KHS_v1.jsonl | 6.5KB | docs/ark/khs/ | CONNECTED (knowledgeLoader.ts) |
| 5 | DOMAIN_GLOSSARY_KHS_v1.tsv | 2.3KB | docs/ark/khs/ | CONNECTED (knowledgeLoader.ts) |
| 6 | DOMAIN_GUIDE_KOTODAMA_KHS_v1.txt | 3KB | docs/ark/khs/ | PRESENT (参照元不明) |
| 7 | iroha_kotodama_hisho.json | 275KB | server/data/ | server/kotodama/kotodamaLoader.ts → server/kokoro/kokoroEngine.ts |
| 8 | kotodama_genten_data.json | 30KB | / (root) | PRESENT (参照元不明) |

## 2. 接続状態マップ

### api/ 側（本番チャット chat.ts）

本番チャットのルーティングを担う `chat.ts` は、複数の知識資産と学習機構に接続されています。具体的には、`buildKnowledgeContext()` を通じて `soundMeanings.json`（51音の音義）、`amatsuKanagi50Patterns.json`（天津金木パターン）、`katakamuna80.json`（80首）、`EVIDENCE_UNITS`、および `GLOSSARY` を読み込んでいます。また、`searchKokuzoPagesForContext()` を用いて `kokuzo.sqlite` の FTS（全文検索）に接続し、DEF/GENルートで活用しています。

学習機構についても、`buildGrowthContext()` が `growth_seeds` テーブルに接続して過去の学びを抽出し、`buildFractalContext()` がパターン検出を行っています。会話完了後には `selfLearnFromConversation()` が呼び出され、自動学習ループが機能しています。さらに、`buildConsciousnessPrompt()` によって `consciousnessOS.ts` の意識OS層とも連携しています。

### api/ 側（切断箇所）

一方で、重大な切断箇所がいくつか確認されました。最も致命的なのは `buildKotodamaClause()` と `kotodamaConnector.ts` の完全切断です。このファイルは `mc-phase5` ブランチにのみ存在し（commit `42cfa245` で管理化）、`main` ブランチには存在しません。さらに、`chat.ts` からのインポートや呼び出しが一切なく、依存先である `kotodamaOneSoundLawIndex.ts` は `@deprecated DEAD_FILE` とマークされています。

また、275KBの巨大なテキストデータである `iroha_kotodama_hisho.json` は、`api/` 側からは直接参照されていません。このファイルは `server/kotodama/kotodamaLoader.ts` によって読み込まれますが、`api/` は `server/` をインポートしないアーキテクチャになっているため、典型的な「2コードベース問題」を引き起こしています。その他、`kotodama_genten_data.json`（30KB）と `DOMAIN_GUIDE_KOTODAMA_KHS_v1.txt` はリポジトリ内に存在しますが、どこからも参照されていない状態です。

### server/ 側（tRPC chatCore）

`server/` 側は別プロセスとして機能しており、独自の知識資産を持っています。`applyKotodamaLayer()` は言霊変換レイヤー（旧字体・古代仮名・霊核フィルター）として機能し、`getKotodamaSystemPrompt()` は `iroha_kotodama_hisho.json` を読み込んで `kokoroEngine` に提供しています。また、`server/kotodama.ts` は五十音深層構文解析（51音完全データ）を内包し、`server/` 内で完結した処理を行っています。

## 3. 2コードベース問題の具体的影響

このアーキテクチャの分離により、知識資産の分断が発生しています。`api/chat.ts` は `soundMeanings.json` の51音データを持っていますが、`iroha_kotodama_hisho.json` の275KBに及ぶ言霊秘書全文テキストにはアクセスできません。逆に、`server/` 側は高度な言霊変換レイヤー（旧字体・古代仮名変換）を持っていますが、これが `api/` 側の出力には適用されていません。さらに、一音法則索引から宿曜接続を行う `kotodamaConnector.ts` は完全に孤立しており、どちらのコードベースでも活用されていない状態です。

## 4. ゲストチャットへの影響

今回新規作成した `guest.ts` は、純粋に `llmChat()` のみを呼び出す設計となっています。`knowledgeLoader`、`growthEngine`、`consciousnessOS` のいずれもインポートしていないため、ゲストチャットは天聞アークの膨大な知識資産に一切接続しておらず、純粋なLLMの事前知識のみで応答する状態になっています。

## 5. 再接続の優先度と作業計画

### P0: buildKotodamaClause 呼び戻し（Week 2）
最も緊急度が高いのは、言霊発火ゼロの真因である `buildKotodamaClause` の復旧です。`kotodamaConnector.ts` と `kotodamaOneSoundLawIndex.ts` を `main` ブランチにマージし、`chat.ts` にインポートと呼び出しを追加して、宿曜継続対話ルートに注入する必要があります。

### P1: iroha_kotodama_hisho.json のapi/側接続（Week 2-3）
次に、275KBの言霊秘書全文データを `api/` 側で利用可能にします。`knowledgeLoader.ts` に `iroha_kotodama_hisho.json` の読み込みロジックを追加するか、`shared/` ディレクトリにシンボリックリンクを作成して両コードベースから参照できるように統一します。

### P2: ゲストチャットへの知識注入（Week 3）
ゲストチャットの品質向上のため、`guestSystemPrompt.ts` に `buildKnowledgeContext()` の軽量版を組み込みます。特に起点ボタンからの応答に対して、言霊秘書データやカタカムナの知識を動的に注入する仕組みを構築します。

### P3: kotodama_genten_data.json の接続先特定（Week 3）
現在未接続となっている30KBの `kotodama_genten_data.json` の内容を精査し、`knowledgeLoader.ts` または `server/kotodama.ts` のどちらに統合すべきかを決定し、接続作業を行います。

### P4: 言霊変換レイヤーのapi/側適用（Week 4）
最終的に、`server/kotodama/kotodamaLayerIntegration.ts` のロジックを `api/` 側にも適用し、`chat.ts` の最終出力に対して旧字体や古代仮名の変換が行われるように統合します。
