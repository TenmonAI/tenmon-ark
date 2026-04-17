# TENMON-ARK Full System Analysis: Executive Summary

**作成者**: Manus AI
**日付**: 2026-04-17 (最終更新: 2026-04-17)
**対象**: TENMON-ARK プロジェクト全体 (GitHubリポジトリ + VPS実環境 + Notion MCP)

## 1. 解析の目的と背景

本解析は、TENMON-ARKプロジェクトの現在の実装状態と、Notion上に定義された「完成像（TENMON_AI_CORE_V1）」との間のギャップを特定し、最終的な完成に向けたロードマップを策定することを目的としている。GitHubリポジトリの静的解析（Track A）、VPS上で実行したREAD-ONLY解析スクリプト（Track B: 8/8ステップ完了）、および統合解析（Track C）の三段階で実施した。

## 2. 主要な発見 (Key Findings)

### 2.1. 言霊発火ゼロの真因特定

言霊エンジン（RouteReason / Evidence Bind）が発火しない問題について、段階的な調査を経て真因を特定した。

当初は `api/src/kotodama/kotodamaConnector.ts` が Git 管理外（untracked）であったことが原因と推測されたが、Git 管理下に追加（commit `42cfa245`）しても問題は解決しなかった。コードを精査した結果、`api/src/routes/chat.ts` のリファクタリング時に `buildKotodamaClause()` の呼び出しが抜け落ちていたことが判明した（定義は存在するが呼び出しが 0 件）。修復は `chat.ts` に数行追加するだけで完了する見込みである。

### 2.2. データベースの肥大化 (42%が死蔵/休眠)

SQLite データベース（`kokuzo.sqlite`）の 111 テーブルを分類した結果、実際に稼働しているのは 23 テーブル（mainline: 16, active: 7）のみであり、残りの 88 テーブル（dormant: 30, dead: 37, empty: 10, no_ts: 11）は休眠または死蔵状態にあることが判明した。

### 2.3. 隠れた機能の未接続 (13機能診断)

13の高度な機能を個別診断した結果、3機能が mainline、6機能が partial、4機能が absent と判定された。特に **Founder導線 (founder_onboarding)** は販売可能完成に致命的であり、**ハイブリッドLLM (hybrid_llm)** はモデルが `gemini-2.5-flash` に固定されたまま切替ロジックが未実装であった。

### 2.4. クラッシュループの発見と修復

`tenmon-strict-promotion` が直近7日間で 117,887 回の再起動失敗を記録し、Notion タスク関連の3サービスも連鎖的にクラッシュループに陥っていた。これらのサービスは直ちに停止・無効化され、クラッシュループは解消された（117,887回/週 → 0回）。本体 API の健全性（uptime 228日継続）への影響はないことが確認されている。

### 2.5. Notion完成像とのギャップ

Notionの「TENMON_ARK_MASTER_STATE_INDEX_V1」によれば、現在の最優先事項は `TENMON_AI_CORE_V1` を商品核として成立させることである。現在の達成率は約82%（会話主線/route修理は92〜96%完了）であり、acceptanceテストの未通過、continuityのdensity問題、bridge hangなどが未完ブロッカーとして残っている。

## 3. 90日ロードマップ（再調整版）

| 優先度 | 課題 | 時期 | 難易度 |
| :--- | :--- | :--- | :--- |
| 1 | `buildKotodamaClause` 呼び戻し（言霊発火ゼロ解消） | Week 2 | 低（数行追加） |
| 2 | `sync_shuku_data` 型エラー修正（56件） | Week 2 | 低〜中 |
| 3 | Founder導線の完全実装（最重要） | Week 3-4 | 高 |
| 4 | ハイブリッドLLMの有効化 | Week 5-6 | 中〜高 |
| 5 | Dead テーブル退役（42%のDB整理） | Week 7-8 | 中 |

## 4. 成果物一覧

本解析の全成果物は `feature/full-system-analysis-track-b` ブランチに格納されている。

| ファイル | 内容 |
| :--- | :--- |
| `analysis/TRACK_C_INTEGRATED_ANALYSIS.md` | Track C 完全版統合レポート |
| `analysis/ROADMAP_90DAYS.md` | 90日ロードマップ（再調整版） |
| `analysis/FULL_REPORT.md` | 包括的レポート |
| `analysis/ARCHITECTURE.mmd` | アーキテクチャ図（Mermaid） |
| `analysis/track_a/` | Notion読み取り結果 + コード解析レポート |
| `analysis/track_b/scripts/` | VPS解析スクリプト（8本 + 共通ライブラリ2本） |
| `analysis/track_b/output/` | VPS実行結果データ（8ステップ分） |
