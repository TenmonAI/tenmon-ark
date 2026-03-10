# Notion Asset Audit v1

このドキュメントは、天聞ARKへの完全移植を見据えて、Notion内の主要ページを役割ごとに整理したものです。ここでは、各ページの役割・有用性・将来の取り込み先候補を明示します。

---

## 1. 言灵秘書データベース

- **page title**: 言灵秘書データベース
- **role classification**: 正典核（canonical evidence base）＋部分的に subconcept インデックス
- **why useful**:
  - 言霊・水火・五十音一言法則・五十連十行など、天聞軸の基礎となる法則層の原典断片を一括で参照できる。
  - Scripture canon / concept canon / subconcept canon の「証拠面」を補強する根拠層として機能し、generic drift を抑える鍵になる。
  - 特定の用語・ウタヒ・枝概念に対して、どの断片を first-class evidence とするかを決める際のハブとして機能する。
- **candidate target**:
  - **scripture canon**: `kotodama_hisho` 系 scripture の evidence source（`evidence_priority` の上位）としてマッピング。
  - **subconcept canon**: ア・ヒ・五十音一言法則・五十連十行など、一音・一構文レベルの根拠リンク。
  - **thought guide**: 「どの断片から入るか」を指示する thought guide の引用元。
  - **gap miner**: 未カバーの用語・法則・断片を洗い出すギャップ検出用ソース。

---

## 2. カタカムナ完全系統樹・決定版

- **page title**: カタカムナ完全系統樹・決定版
- **role classification**: 正典核（系統マップ）＋ thought guide 核
- **why useful**:
  - 楢崎本流・宇野会誌本流・現代スピリチュアル枝・天聞再統合軸など、カタカムナ周辺の系統と位置関係を一枚で把握できる。
  - KATAKAMUNA_CANON_ROUTE_V1 の「どの枝から説明を始めるか」を決める際の authoritative map として使える。
  - 思考ガイド側では、「いまどの枝にいるか」「次にどの枝へ移るか」を案内するルート図としてそのまま流用可能。
- **candidate target**:
  - **subconcept canon**: `narasaki_mainline` や「再統合軸」など、個々の枝を下位概念として formalize する際の元データ。
  - **thought guide**: カタカムナ関連 thought guide のルート構造（系統別の入口・分岐・出口）のベース。
  - **persona constitution**: 「どの枝の温度・姿勢で話すか」を決める際の persona 側参照情報。
  - **gap miner**: 系統樹に載っていない派生・誤解系統を検出するための基準マップ。

---

## 3. 空海・楢崎皐月・天聞のカタカムナ解釈と解読法の比較評価

- **page title**: 空海・楢崎皐月・天聞のカタカムナ解釈と解読法の比較評価
- **role classification**: 比較評価核（comparison / appraisal core）
- **why useful**:
  - 空海軸・楢崎本流・天聞再統合軸それぞれの解釈スタンス、強み・限界、読解の入口が明示されている。
  - 「どの軸から説明するか」「どの軸を避けるか」を AI 側で選択する際の評価基準になり、generic drift や偏った解釈への流出を防ぐ。
  - Thought guide 側で「いまはどの軸の解釈を採用して説明しているか」をユーザーに明示するためのフレームとしても利用できる。
- **candidate target**:
  - **thought guide**: カタカムナ解釈に関する「軸選択ガイド」や「比較ステップ」のガイドツリー。
  - **persona constitution**: 説明時にどの比重で各軸を混ぜるか（例: 天聞7割＋楢崎2割＋空海1割）の設計指標。
  - **gap miner**: 軸間で評価が揃っていない論点の抽出（例: 効用中心 vs 成立原理中心）に使う。

---

## 4. 楢崎皐月と天聞の比較評価

- **page title**: 楢崎皐月と天聞の比較評価
- **role classification**: 比較評価核＋ persona constitution 補助
- **why useful**:
  - 楢崎皐月と天聞のスタンス差（何を優先し、何を後景に退けるか）が具体的に整理されており、AI 応答の「どこまで楢崎寄りか／どこまで天聞寄りか」を調整するダイヤルとして使える。
  - 「楢崎の語り口を尊重しつつ、天聞としてはここでブレーキをかける」といった微妙な線引きを、LLM 側の persona・スタイル設定に反映しやすい。
  - カタカムナに限らず、他の正典軸（言霊・水火・天津金木）においても「原典そのもの vs 天聞の読み直し」の距離感を決めるテンプレートになる。
- **candidate target**:
  - **persona constitution**: 「天聞ARKがどのポジションから話すか」を formalize するための比較軸。
  - **thought guide**: 「まず楢崎の言い方で確認 → その後天聞の再統合軸で見直す」といった二段階ガイドの設計材料。
  - **gap miner**: 楢崎の射程と天聞の射程の差分から、まだ埋まっていない説明ギャップを特定する。

---

## 5. AIはなぜカタカムナの本質を理解したのか？

- **page title**: AIはなぜカタカムナの本質を理解したのか？
- **role classification**: thought guide 核（メタ認知・ストーリーライン）＋作業メモ
- **why useful**:
  - AI がどのルート・どの証拠層から「本質」を捉えたとみなせるのか、そのプロセスとキーとなる条件が言語化されている。
  - Thought guide 側で「どの順で問いを積み重ねれば、本質に近づくか」を設計する際のメタ・ストーリーとして再利用できる。
  - future tuning / gap mining の観点では、「この条件が揃わないと本質理解に届かない」という失敗パターンのメモとしても有用。
- **candidate target**:
  - **thought guide**: 「本質理解までの道筋」を explicit なガイドフロー（ステージ／チェックポイント）として formalize。
  - **persona constitution**: 天聞ARK自身が「どのように理解してきたか」を meta-voice として語る際の基礎ストーリー。
  - **gap miner**: まだ欠けている前提（例: 水火の基礎理解、言霊・原典との接続）がどこにあるかを洗い出すリファレンス。

---

## 次カード候補

- **scripture / subconcept 強化系**:
  - `R8_SCRIPTURE_CANON_NOTION_BIND_V1`  
    - 上記 Notion ページから scripture canon / subconcept canon への具体的なフィールドマッピングを定義する。
- **thought guide 設計系**:
  - `R8_THOUGHT_GUIDE_AXIS_FROM_COMPARISON_V1`  
    - 「空海・楢崎・天聞の比較評価」「楢崎皐月と天聞の比較評価」「AIはなぜ〜」をもとに、thought guide の軸（どの視点から話すか）を formalize。
- **persona / style 設計系**:
  - `R8_PERSONA_CONSTITUTION_FROM_NOTION_V1`  
    - 楢崎 vs 天聞の比較・系統樹・本質理解プロセスから、天聞ARK persona の基準線（どこまで踏み込むか／どこで止まるか）を抽出して定義する。

