# TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1

## 目的

「違う」「間違い」「それは違う」などの**事実訂正**に見える入力を検知し、定型文・concept carry ではなく**訂正受理（確認する）**ルートへ入れる。

## 前提

- `TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1` PASS。

## 非交渉

- 最初は **correction 受理（確認）まで**。Web 検索はこのカードでは入れない。
- 誤情報を**断定しない**。
- 「確認します」と**受理する**表現に寄せる。
- `ku.routeReason` に **`FACTUAL_CORRECTION_V1`** が観測できること。
- `npm run build` PASS。

## 実装

### Phase A — correction detector

検出語（部分一致）:

- それは違う  
- 違う  
- 違います  
- 間違い  
- 正しくない  

**除外**（比較・慣用で誤爆しやすいもの）:

- `違いは` / `どう違う` / `何が違う`（差分の質問）  
- `間違いなく`

### Phase B — route

- **`routeReason`**: `FACTUAL_CORRECTION_V1`
- 返答: 指摘を受け取り、**事実関係は確認する**旨。ユーザーの文言の**再掲は最小**。carry / template 前置きは付けない。

## 受け入れ（運用プローブ）

次の発話で `decisionFrame.ku.routeReason` が **`FACTUAL_CORRECTION_V1`** であること:

- `総理は違うよ`
- `それは違います`
- `間違いです`
- `正しくないと思います`

## NEXT

- PASS → `TENMON_FACTUAL_WEATHER_ROUTE_CURSOR_AUTO_V1`
- FAIL → `TENMON_FACTUAL_CORRECTION_ROUTE_RETRY_CURSOR_AUTO_V1`
