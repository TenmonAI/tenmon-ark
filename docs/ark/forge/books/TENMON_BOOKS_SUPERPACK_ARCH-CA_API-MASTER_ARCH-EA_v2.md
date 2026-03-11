# TENMON-ARK BOOKS SUPERPACK (ARCH-CA / API-MASTER / ARCH-EA)
Single-file instruction pack for **天聞AI（=あなたのChatGPT作業環境）**が、PDFから“必要情報だけ”を抽出して **TENMON-ARK開発判断を高速化**するための統合ドキュメント。

- Version: **v2**
- GeneratedAt: 2026-02-03
- Primary Goal: **「1冊＝実装カード」→（Law/Alg化）→ acceptanceで封印** を最短距離で回す
- Scope (first wave): **ARCH-CA / API-MASTER / ARCH-EA**
- Notes:
  - ここでの“学習”は **TENMON-ARKへ丸ごと投入**ではなく、まず **天聞AI側で理解→判断→カード化**すること。
  - TENMON-ARK側へ入れるのは、**確定した結論（カード）だけ**。それを acceptance で固定化する。

---

## 0) 上位不変条件（全書籍の共通の受け皿）
書籍から得た知見は、必ずこの4点に吸収する。ここがブレると全部がブレる。

1. **契約固定（API-MASTER）**
   - Phase2（候補→番号選択→detail）と **/api/audit** は外部契約（壊すな）
2. **統治固定**
   - decisionFrame.llm === null（ランタイムLLM禁止）
   - decisionFrame.ku は全経路 object
3. **封印**
   - 最終権威は scripts/acceptance_test.sh（PASSしない変更は無効）
4. **最小diff**
   - 境界1本ずつ増やす（大改造禁止）

---

## 1) 最短ワークフロー（1冊＝実装カード化）
### 1-1. 目次で「切る」（深掘りは“必要章だけ”）
- 1冊を全部読むのは不要
- **設計判断に直結する章だけ**読む（下の「採用スコープ」参照）

### 1-2. 1章＝カード（Implementation Card）に落とす
カードは **必ず1変更＝1ゲート**まで落とす。

- Card fields（必須）
  - bookCode / chapter / title
  - what: 何を変える（最小diff）
  - why: どの不変条件を守るためか
  - where: 触るファイル/境界
  - gate: acceptance_test.sh に入れる jq/grep 条件
  - rollback: FAIL時に戻す手順

### 1-3. カードの昇格ルール（TENMON-ARKへ入れるか）
- すぐ入れる（昇格）
  - 契約（API形） / 統治（ku/llm） / 監査（audit） / Fitness（テスト） / 境界（依存方向）
- 後回し（保留）
  - 大規模リファクタ / フレームワーク置き換え / UI全面刷新

---

## 2) 横断まとめ（18冊＋付帯ドキュメントを“必要”だけ抽出する見取り図）
### 2-1. アーキ・設計（最優先ゾーン）
#### ARCH-CA（Clean Architecture）
**採用スコープ（ここだけ）**
- Dependency Rule（依存は内向き）
- UseCase中心 / Screaming Architecture
- Ports & Adapters（I/Oは外へ）

**TENMON-ARKで効く場所**
- chat.ts 肥大化の根治（方針 vs 詳細）
- DB取り込み/検索/監査の同居を解体しても回帰しない

**封印ゲート（例）**
- “UseCase単体がDB無しで実行可能”をユニット or acceptanceで確認
- 内側→外側参照禁止を静的チェック（後述）

---

#### API-MASTER（マスタリングAPIアーキテクチャ）
**採用スコープ（ここだけ）**
- API＝契約（入力/出力/エラー形式）
- 互換進化（破壊的変更NG、追加のみ）
- 観測可能性も契約に含める（SLO/構成同定）

**TENMON-ARKで効く場所**
- Phase2 と /api/audit を“設計上の聖域”にできる
- WAIT_DB 等の停滞を「状態」として説明できる

**封印ゲート（例）**
- /api/audit のキー削除・改名禁止（追加OK）
- Phase2 レスポンス形の回帰テスト固定

---

#### ARCH-EA（Building Evolutionary Architectures）
**採用スコープ（ここだけ）**
- 進化は前提。怖がらず進めるために **Fitness Function** を置く
- テスト＝ガードレール（崩壊を先に止める）

**TENMON-ARKで効く場所**
- acceptance_test.sh を Fitness Function の中核に格上げ
- “最小diffで進める”が体系化する

**封印ゲート（例）**
- 新しい制約は必ずテストへ（PASSでのみ存在扱い）

---

### 2-2. 品質・型・保守（回帰を減らすゾーン）
（ここは2nd wave。今はARCH-CA/API-MASTER/ARCH-EAの後）
- REFAC：小さく安全に変える＝acceptanceと相性最大
- TS-ET：境界DTO/unknown隔離/null排除で事故を減らす
- PRAG：自動化・可視化・改善ループ（運用手順固定と直結）

---

### 2-3. UI/UX（販売に直結するゾーン）
（Founder販売の“体験品質”に効く。バックエンド契約が固まってから）
- React：状態管理と責務分離＝UI回帰防止
- UI-OOD：Thread/Message/Candidate/Evidenceを“オブジェクト”で設計
- UX-LAWS/UI-NEW/DESIGN-NON/UX-UE：迷わないUI・説明できるUI

---

## 3) 3冊の「最初に切るべき章」＋「カード化テンプレ」（投入用）
ここがこのファイルの主目的。**ARCH-CA → API-MASTER → ARCH-EA** の順で回す。

---

### 3-A) ARCH-CA（Clean Architecture）投入用
#### まず切る章（目次ベース）
- 依存性逆転 / Dependency Rule
- Use Case / Application Business Rules
- Interface Adapters（Controller/Presenter/Gateway）
- Boundaries（境界線とテスト）

#### ここから作る“最小カード”セット（推奨3枚）
**CARD ARCH-CA-01: ChatUseCase を作って routes/chat を薄くする**
- what: routes/chat の分岐を “UseCase呼び出し＋整形”に寄せる
- where:
  - api/src/usecases/chatUseCase.ts（新規）
  - api/src/routes/chat.ts（薄くする）
- gate:
  - Phase2（候補→番号→GROUNDED）を回帰させない
  - decisionFrame.llm==null & ku object 既存ゲート維持
- rollback: commit単位で戻す（ファイル追加が主なので戻しやすい）

**CARD ARCH-CA-02: KokuzoRepoPort を切る（DBアクセス隠蔽）**
- what: sqlite直叩きを repo 経由に寄せる（検索・ページ取得）
- where:
  - api/src/ports/kokuzoRepoPort.ts（interface）
  - api/src/adapters/kokuzoSqliteRepo.ts（実装）
- gate:
  - /api/chat の candidates が出る（Phase39/Phase27）
- rollback: adapter差し替えで戻せる

**CARD ARCH-CA-03: “依存の向き”静的チェック（最小）**
- what: 内側(usecases)が adapters/routes を import していないことを grep で保証
- gate:
  - acceptanceに grep -R で “forbidden import” が無いことを追加
- rollback: ゲート追加を外す（ただし原則外さない）

---

### 3-B) API-MASTER（マスタリングAPIアーキテクチャ）投入用
#### まず切る章（目次ベース）
- API as a Product / 契約の重要性
- Versioning / Compatibility（互換進化）
- Observability（監査・SLO・トレーシング）
- Error Model（エラー形式の統一）

#### ここから作る“最小カード”セット（推奨3枚）
**CARD API-MASTER-01: /api/audit を“契約”として固定強化**
- what: readiness の状態機械を固定（READY/WAIT_DB/…）＋キー削除禁止
- gate:
  - Phase00（audit.gitSha==HEAD）
  - readiness.ready==true を待つ既存ロジック維持
- rollback: キー追加のみ（削除しない）

**CARD API-MASTER-02: エラー形式の統一（ok:false + error + detail）**
- what: 主要エンドポイントの失敗時を統一（ingest/upload/alg/law）
- gate:
  - acceptanceで 4xx/5xx 時のJSON形を jqで検証
- rollback: 既存互換を保った追加のみで進める

**CARD API-MASTER-03: 破壊的変更禁止ルールをゲート化**
- what: APIレスポンスの必須キーを acceptance で監査（削除したらFAIL）
- gate:
  - /api/audit key set
  - /api/chat decisionFrame contract
- rollback: 追加のみ

---

### 3-C) ARCH-EA（Building Evolutionary Architectures）投入用
#### まず切る章（目次ベース）
- Fitness Functions（分類：Automated / Architectural）
- Incremental Evolution（小さく進める）
- Coupling & Conway’s Law（境界設計）

#### ここから作る“最小カード”セット（推奨3枚）
**CARD ARCH-EA-01: acceptance_test.sh を “Fitness” として分類**
- what: acceptance の Phase をカテゴリ分け（Contract/Corpus/UI/Seed）
- gate: 既存PASS維持（新規は追加のみ）

**CARD ARCH-EA-02: 新機能は必ず “Gate付き”のルールを明文化**
- what: PRテンプレ or DECISIONS_LOG 運用に “Gate必須”を追加
- gate: docsの更新が入ってないPRは無効（運用）

**CARD ARCH-EA-03: Fitnessの粒度追加（壊れやすい所に先に置く）**
- what: ingest / upsertPage / kokuzo_pages の最小E2Eを強化
- gate:
  - Phase44 ingest request/confirm
  - Phase39 corpus gate
- rollback: テストだけ先に入れて実装を追従させる

---

## 4) 実装カード（コピペ用テンプレ）
```md
## CARD {BOOK}-{NN}: {Title}
- bookCode: {ARCH-CA|API-MASTER|ARCH-EA}
- chapter: {章/節}
- intent: {何を速く/安全にするか}
- invariant: {守る不変条件}
- change:
  - {最小diffでの変更内容}
- files:
  - {path}
- gate (acceptance):
  - {jq -e / grep -Eq の条件}
- rollback:
  - {戻す手順}
- doneWhen:
  - {PASS条件}
```

---

## 5) 運用ループ（VPS/作業手順固定）
**ここだけ固定で回す（最短）**
```bash
# 0) ssh後
tmux new -As tenmon
cd /opt/tenmon-ark-repo/api
set +H

# 1) まず現状PASS確認
bash scripts/acceptance_test.sh

# 2) 変更を入れたら
pnpm -s build
bash scripts/deploy_live.sh
sudo systemctl restart tenmon-ark-api.service

# 3) READY待ち（audit）
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS -m 1 http://127.0.0.1:3000/api/audit | jq -e '.ok==true' >/dev/null 2>&1 && break
  sleep 0.4
done

# 4) 再度PASS
bash scripts/acceptance_test.sh |& tee -a logs/acc_$(date +%F_%H%M%S).log
```

---

## 6) 次にあなたがやること（このファイルを“最大活用”する手順）
1. ARCH-CA の CARD 3枚を作って、1枚ずつ入れる（Gate追加→PASS→次へ）
2. API-MASTER の CARD 3枚を作って、契約（/api/audit・エラー形式）を固める
3. ARCH-EA で acceptance を Fitness として整理し、運用を“迷いゼロ”にする

---

## 付録A: 18冊全体の“位置づけ”メモ（短）
- 1st wave: ARCH-CA / API-MASTER / ARCH-EA
- 2nd wave: TS-ET / REFAC / DESIGN-COUPLING / ARCH-FUND / DDD-INTRO / NODE-DP
- 3rd wave: UI/UX系（販売品質の底上げ）

---

## 付録B: このファイルをTENMON-ARKへ“入れる必要はない”
これは **開発判断を高速化するための天聞AI用の指示書**。
TENMON-ARKへ入れるのは、ここから生まれた **カード（Law/Alg/acceptanceゲート）だけ**。
