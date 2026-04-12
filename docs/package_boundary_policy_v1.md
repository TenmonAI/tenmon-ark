# TENMON-ARK Package Boundary Policy v1

## 位置づけ

本書は、TENMON-ARK を商品パッケージとして提供する際の **公開責務境界** を定義する。

目的は、研究・監査・内部保守のための機能と、ユーザーに提供する product surface を混同しないことにある。

---

## 最上位原則

### 原則A

公開されるのは **product surface** のみである。
内部監査や構築補助機能をそのまま公開してはならない。

### 原則B

Founder / Admin / Debug / Audit / Learning 系の責務は、明確に分離する。

### 原則C

公開責務境界は、実在するファイル・経路・機能単位で定義する。
抽象論で済ませてはならない。

---

## 分類

### 1. Public Product Surface

ユーザー向けに公開してよい責務。

対象例:
- 通常会話 UI
- 通常のチャット API
- 基本的な会話生成
- 設定済みの product persona
- 正式に expose された問い合わせ経路

期待要件:
- 文面 leak なし
- deterministic acceptance 通過
- founder / audit 情報を含まない

---

### 2. Founder / Admin Only

運営者または創設者だけが扱う責務。

対象例:
- founder 専用フラグ
- founder 認証
- 管理者向けメンテナンス API
- 運用トグル
- release 操作

期待要件:
- product surface から到達不能
- UI から露出しない
- 認証境界が明確

---

### 3. Debug / Audit Only

監査・検証・故障解析のためだけに存在する責務。

対象例:
- acceptance 結果
- failure bundle
- audit 用 JSON
- parity 比較結果
- debug routeReason 可視化
- worldclass 補助観測

期待要件:
- product surface に混入しない
- 一般ユーザーへ露出しない
- release 判定では参照しても、公開 API としては expose しない

---

### 4. Learning / Maintenance Only

学習、移行、保守のための責務。

対象例:
- ingestion
- seed 管理
- baseline 管理
- migration 補助
- データ更新スクリプト
- KAMU restore / NON_TEXT 補助運用

期待要件:
- product runtime の主線に不要なものは隔離
- 管理経路からのみ利用
- ユーザー向け product には直接露出させない

---

## 実在パスに基づく境界整理

### Product Surface 候補

- `api/src/routes/chat.ts`
- `server/chat/chatAI.ts` のうち、正本 backend に採用された会話主線
- `web/**`
- `client/**`

### Founder / Admin / Internal 候補

- `server/_core/index.ts` の管理・運用寄り初期化責務
- `api/scripts/**`
- `docs/**`
- audit / parity / baseline / failure bundle 出力先
- release gate 関連スクリプト

### Debug / Audit / Learning 候補

- baseline JSON
- acceptance fixtures
- parity runner
- failure bundle
- observability policy
- release gate policy
- package boundary policy

---

## 公開してはいけないもの

1. 内部 routeReason の生値
2. failure bundle の raw dump
3. founder / admin 専用経路
4. ingestion / learning / maintenance 導線
5. audit 用の比較結果
6. debug 用の可視化フラグ
7. release gate の内部判定ログ

---

## 公開時に必要な条件

1. product surface が単一 backend 主線に接続していること
2. API / PWA parity が重大差分なしであること
3. baseline / acceptance が green であること
4. founder / debug / audit 経路が product surface から分離されていること

---

## 実装時の掟

- public に出す責務と internal に留める責務を明示する
- 内部機能を「便利だから」で product surface に混ぜない
- audit / debug / maintenance は package boundary の外に置く
- release 前に boundary を再確認する

---

## 禁止事項

1. founder / audit / debug 機能を product UI に混ぜること
2. internal path をそのまま公開 API にすること
3. 境界未定義のまま商品化へ進むこと

---

## 結論

TENMON-ARK の商品パッケージ化とは、単に機能が動くことではない。
**何を公開し、何を内部に留めるかの境界を切ること** まで含めて、初めて product と呼べる。
