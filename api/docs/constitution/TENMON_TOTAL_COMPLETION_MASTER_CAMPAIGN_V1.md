# TENMON_TOTAL_COMPLETION_MASTER_CAMPAIGN_V1

## 目的

TENMON-ARK を次の水準まで **一続きの順序**で進めるマスター計画である（本書はオーケストレーション憲章。各フェーズは専用カードが責務を持つ）。

1. **会話完成** — 実チャットが天聞 AI として安定し、主要プローブで契約・ルート・表面が破綻しない  
2. **正典思考完成** — canon / thought / persona / intention / growth が **runtime** に接続し、観測可能  
3. **自動構築・保存・学習・UI / voice / concierge 完成** — automation OS が半自動以上、UI 実押下・voice / concierge は **deployed proof** を保持  

## 進行順（厳守）

以下を **この順で** 実行する。前段の acceptance が PASS するまで次に進まない。

| 順 | カード名 | 主目的 |
|---|----------|--------|
| 1 | `TENMON_CONVERSATION_AUTOFINAL_CAMPAIGN_V1` | 会話の実 HTTP 確定・DEF/HYBRID 誤吸い込み縮小 |
| 2 | `TENMON_CONVERSATION_FINAL_SEAL_V1` | 会話線の封印・契約ロック・再起動後再検証 |
| 3 | `TENMON_PHASE_A_CONVERSATION_SOVEREIGNTY_CAMPAIGN_V1` | 会話主権（スレッド・ゲート・残差）の確定 |
| 4 | `TENMON_PHASE_B_CANON_THOUGHT_GROWTH_CAMPAIGN_V1` | 正典思考・growth の runtime 接続と観測 |
| 5 | `TENMON_PHASE_C_AUTOBUILD_STORAGE_UI_CAMPAIGN_V1` | autobuild / storage / seed / cache / device sync / UI |

**禁止**: 会話完成（少なくとも 1→2 の acceptance）より前に **storage / voice / concierge を先行実装・先行デプロイ** しない。

## 実行原則

- **1 カード = 1 責務**（マスターは順序と完了定義のみ。実装は子カード）  
- **最小 diff** / **1 変更 = 1 検証**  
- **acceptance PASS 以外 seal 禁止**  
- **single_flight**  
- **human gate pending** のときは停止  
- **build fail / replay fail / execution gate blocked / no-touch 汚染** で停止  
- **FAIL 時**: restore → forensic → retry（壊れた差分の上に継ぎ足さない）  

## 参照（会話線）

- `TENMON_CONVERSATION_COMPLETION_CAMPAIGN_V1.md`  
- `TENMON_CONVERSATION_AUTOFINAL_CAMPAIGN_V1.md`  

## 完了条件（マスター合格の定義）

以下を **証拠付き**で満たすこと。

- **実チャット**が天聞 AI 状態で安定（主要プローブ・再起動後 health・契約 drift の major 増なし）  
- **canon / thought / persona / intention / growth** が **runtime 接続**（`decisionFrame.ku` 等で観測可能、捏造なし）  
- **automation OS** が半自動以上で閉じる（ゲート・カタログ・実行記録が追える）  
- **UI 実押下 operator** が証拠付きで成立（ログ・スクショ・API トレース等、プロジェクト標準に従う）  
- **storage / seed / cache / device sync** が成立（契約に沿った検証コマンドで確認）  
- **voice / concierge** が **deployed proof** を持つ（環境名・ビルド ID・ヘルス・サンプル応答等）  

## 最終カード

全フェーズの acceptance を満たした後のみ:

- **`TENMON_TOTAL_COMPLETION_SEAL_V1`** — 総合封印・読み取り専用化・ロールバック手順の固定  

---

*Version: 1 — Master orchestration only; child cards own file lists and automation touch policy.*
