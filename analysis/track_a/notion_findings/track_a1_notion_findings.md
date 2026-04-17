# Track A.1: Notion 完成像の読み取り結果

## 1. Notion全体構造

### 参照統治ハブ（天聞AI 参照統治ハブ）
- **5層の参照優先順位**: 正典 > 主線 > 作業 > ログ > 保留
- AI既定参照は「正典 + 主線」のみ
- Workspace全域検索は既定動作にしない

### 主要ページ階層
```
天聞アーク構築スケジュール
├── TENMON_ARK_MASTER_STATE_INDEX_V1（入口ページ）
│   ├── TENMON_AI_CORE_V1_CONSTITUTION（最優先商品化方針）
│   └── TENMON_ARK_COMPLETION_CONSTITUTION_V1（完成憲法）
├── 天聞AI 参照統治ハブ
│   ├── 正本 / Canon Entry
│   ├── 現在地 / Current State
│   ├── 次カード / Next Card
│   ├── 禁止事項 / Guardrails
│   ├── 最新 HEAD / Acceptance 状態
│   ├── VPS Runtime Observatory
│   ├── Internal Circuit Map
│   ├── TENMON 完成ロードマップ統合メモ
│   └── VPS前情報解析ハブ
├── 天聞アーク開発スケジュール
│   └── 【天聞アーク】改善要望DB
└── 今後の構築スケジュール一覧
```

## 2. 改善要望DB

### スキーマ
| フィールド | 型 | 説明 |
|---|---|---|
| タイトル | title | 要望タイトル |
| カテゴリ | select | 宿曜鑑定/チャット機能/ダッシュボード/UI・デザイン/表示・動作の不具合/新機能の要望/文章・口調/スマホ使用感/保存・共有/同期/UI・UX/その他 |
| AI優先度 | select | 緊急/高/中/低/未解析 |
| ユーザー優先度 | select | 高/中/低 |
| ステータス | status | 未着手/進行中/完了 |
| 受付番号 | text | FB-YYYYMMDD-NNNN形式 |
| Founder区分 | checkbox | Founder判定 |
| 構築タスク化 | checkbox | タスク化判定 |
| 詳細内容 | text | 要望本文 |
| AI要約 | text | AI要約 |
| 類似件数 | number | 類似要望数 |

### 確認できた要望（25件中の主要なもの）
1. **宿曜鑑定チャットの長文切れ・会話精度・再補正機能の改善希望** (FB-20260416-4252)
   - カテゴリ: チャット機能、Founder区分: YES、ステータス: 未着手
   - 長文回答途中切れ、定型説明優先、ユーザー実感とのズレ補正、同じ説明の繰り返し
2. **宿曜鑑定における「宿分類と実際の状態の乖離」について** (最新 2026-04-17)
3. **聞いた内容が途中で途切れた**
4. **宿曜鑑定の結果が保存されませんでした**
5. **キーボードのエンターのタイミング**
6. **メニューもじが薄くて見えない**
7. **メニューの左トークルームの未分類から、ドロップでチャットのトークフォルダーに移動できるようにしてほしい**
8. 多数のテスト系エントリ（PUBLIC_RELEASE_ACCEPTANCE, self improvement loop e2e, deploy test等）

## 3. 完成ロードマップ統合メモ

### 統合完成主線（7ステップ）
1. 言灵コア正典を固定する
2. 正典ごとに会話用蒸留カードを作る
3. 橋渡しを唯一の変換ゲートにする
4. 会話ルーターを固定する
5. 深さ制御を入れる
6. 会話記憶と研究記憶を分ける
7. acceptanceを普通会話ベースで通す

### 完成判定基準
- 普通会話が自然
- follow-upが主線維持
- currentが古い断定をしない
- 言灵解析で正典主線が出る
- 深い解析で橋渡しと開発主線が崩れない
- acceptance probeを通る

## 4. MASTER_STATE_INDEX_V1（現在地）

### 三層定義
- **Layer 1**: 天津金木コア（真理構造解析エンジン）
- **Layer 2**: 聖典コーパス参照系（照合・補強）
- **Layer 3**: 会話還元回路（Two-Pass）

### 現在の達成率（運用推定）
| 項目 | 達成率 |
|---|---|
| 会話主線 / route修理 | 92〜96% |
| runtime単一化 | 88〜92% |
| remote runtime proof | 通過済み |
| benchmark / 外部提示基盤 | 整備済み |
| acceptance / rejudge / final seal | 55〜65% |
| **総合到達率** | **約82%** |

### 未完ブロッカー
- acceptance present 2/12, missing 10/12
- continuity density以前にhold entry forensicが必要
- bridge hang（_archive_block系）
- scorecard stale
- pwa_lived_completion_readiness.json未生成

### 禁止事項
- verdict JSONの人工green化
- readiness JSONの手書きready=true
- archive/outを正本扱い
- systemdと手動nodeの混在
- 天津金木の修理済み箇所をroot causeなしに再変更
- scripture_trunk_v1.tsへtenmon_fusionを入れること
- evidenceなしPASS宣言
- dist直編集

## 5. TENMON_AI_CORE_V1 憲法

### 最優先方針
- 商品として最初に売る対象は `TENMON-ARK Full OS` ではなく `TENMON_AI_CORE_V1`
- 言霊秘書を最上位正典とする
- スピ系の曖昧な言霊解釈を採らない
- 1変更=1検証、最小diff

### 7日間ロードマップ
- Day 0: Core憲法封印とbeta到達
- Day 1: acceptance再調整
- Day 2: 言霊秘書系引用精度改善
- Day 3: サンスクリット深層解読安定化
- Day 4: 聖典読解比較の整備
- Day 5: UI/レポート改善
- Day 6: Arc接続候補を1つだけ試験接続
- Day 7: 監査と次週計画

## 6. Manus直接実装済みコミット（2026-04-12）
- ddd154d Phase 6 policy docs + release gate script
- f93c00a EMPTY_CATCH_RECOVERY (75 empty catches → console.debug)
- 40b88c7 CORE_SEED_FULL_RESTORE (placeholder → 190行 knowledge pack)
- aa5e126 LLM_WRAPPER_PERSONA_RELINK (role separation fix + persona injection)
- 37b4cf1 BACKEND_ROLE_RELOCK (dual backend boundary document)
- 95e2e2b GOLDEN_BASELINE_LOCK + REGRESSION_TEST (25 cases, 5 categories)
- 2f0ab11 API_PWA_BRIDGE design document
- 2856552 tenmonBridge.ts + chatAI.ts integration

## 7. pwa-mo1xlk3d 調査結果
- Notion検索では「pwa-mo1xlk3d」という直接的なIDは見つからなかった
- PWA関連ページは多数存在（API_PWA_Equivalence, PWA最終確認等）
- 改善要望DB内にPWA固有の要望は確認できず（チャット機能・宿曜鑑定が中心）
