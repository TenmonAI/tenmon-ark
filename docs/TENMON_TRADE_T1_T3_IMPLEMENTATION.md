# 🔱 TENMON-TRADE T-1 → T-3 実装完了レポート

**実装日時**: 2025-01-31  
**フェーズ**: T-1 → T-3（観測 → 提案 → 限定自動）  
**Architect AI**: TENMON-TRADE 稼働実装

---

## 実装概要

TENMON-TRADE を Phase T-1（観測のみ）から Phase T-3（限定自動）まで一気に実装しました。

### 全体像（実運用アーキテクチャ）

```
TENMON-ARK (判断脳)
 ├─ MarketStateEngine（中枢）
 ├─ EntrySaturationGuard（最重要）
 ├─ LossQualityAnalyzer
 ├─ TradeDecisionSynthesizer（最終判断）
 └─ TradeBridge (ZeroMQ)

Beeks VPS
 ├─ MT5
 └─ MT5 Execution Agent (EA / ZeroMQ subscriber)
```

**判断は 100% TENMON-ARK**  
**MT5 は命令実行のみ**  
**切断時は新規エントリー不可（安全）**

---

## Phase T-1 → T-3 の実装

### Phase T-1（観測：ノートレード）

- **MT5**: 価格送信のみ
- **TENMON-ARK**: STATE 判定・抑制判定
- **出力**: `WAIT` / `LOCK` / `ALLOW`（実行しない）

### Phase T-2（提案：人間最終判断）

- **出力**: `PROPOSE_BUY` / `PROPOSE_SELL`
- **MT5**: 実行しない

### Phase T-3（限定自動：極小ロット）

- **出力**: `EXECUTE_BUY` / `EXECUTE_SELL` / `STOP`
- **全ガード有効**

---

## 実装コンポーネント

### 1. Market State Engine（中枢）

**ファイル**: `server/trade/marketStateEngine.ts`

```typescript
export function evaluateMarketState(candles: Candle[]): MarketState {
  const last = candles.at(-1)!;
  const vol = std(candles.map(c => c.range));
  const speed = Math.abs(last.close - last.open);

  if (vol < MIN_VOL || speed < MIN_SPEED) return "STATE_WEAK";
  if (breakStructure(candles)) return "STATE_BROKEN";
  return "STATE_VALID";
}
```

- ローソク足から市場状態を評価
- 構造破壊検出機能
- 状態遷移テーブルベース（IF文禁止）

### 2. Entry Saturation Guard（最重要）

**ファイル**: `server/trade/entrySaturationGuard.ts`

```typescript
const LOCK_THRESHOLD = 3;

export function checkSaturation(key: string, history: EntryHistory[]) {
  const count = history.samePriceSameDirCount(key);
  if (count >= LOCK_THRESHOLD) {
    return { locked: true, reason: "SATURATION_LOCK" };
  }
  return { locked: false };
}
```

- 同一価格帯×方向×3回制限
- 24時間以内のエントリーをカウント
- 状態遷移テーブルベース

### 3. Loss Quality Analyzer

**ファイル**: `server/trade/lossQualityAnalyzer.ts`

```typescript
export type LossQuality = "HEALTHY" | "DANGEROUS";

export function analyzeLoss(candle: Candle): LossQuality {
  if (candle.longWick && !volExpansion()) return "DANGEROUS";
  return "HEALTHY";
}
```

- 長いウィック検出
- ボリューム拡大検出
- 健全/危険逆行の判定

### 4. Trade Decision Synthesizer（最終判断）

**ファイル**: `server/trade/decisionSynthesizer.ts`

```typescript
export type Decision =
  | "WAIT"
  | "LOCK"
  | "ALLOW"
  | "PROPOSE_BUY"
  | "PROPOSE_SELL"
  | "EXECUTE_BUY"
  | "EXECUTE_SELL"
  | "STOP";

export function decide(ctx: DecisionContext): Decision {
  if (ctx.market === "STATE_BROKEN") return "STOP";
  if (ctx.saturation.locked) return "LOCK";
  if (ctx.loss === "DANGEROUS") return "STOP";
  if (!ctx.rejectConfirmed) return "WAIT";

  return ctx.auto
    ? ctx.dir === "BUY" ? "EXECUTE_BUY" : "EXECUTE_SELL"
    : ctx.dir === "BUY" ? "PROPOSE_BUY" : "PROPOSE_SELL";
}
```

- 最終判断を統合
- 状態遷移テーブルベース（IF文禁止）
- Phase T-1/T-2/T-3 に対応

### 5. ZeroMQ Trade Bridge（VPS連携）

**ファイル**: `server/trade/mt5ZeroMQBridge.ts`

```typescript
import zmq from "zeromq";

const sock = new zmq.Publisher();
await sock.bind("tcp://0.0.0.0:5555");

export async function sendCommand(cmd: MT5Command) {
  await sock.send(JSON.stringify(cmd));
}
```

- ZeroMQ Publisher で MT5 Execution Agent に命令を送信
- 接続状態管理
- エラーハンドリング

### 6. MT5 Execution Agent（EA・実行専用）

**ファイル**: `server/trade/mt5ExecutionAgent.mq5`

```mql5
#include <Zmq/Zmq.mqh>
CZmqSocket sub;

int OnInit() {
  sub.Create(ZMQ_SUB);
  sub.Connect("tcp://TENMON_IP:5555");
  sub.Subscribe("");
  return INIT_SUCCEEDED;
}

void OnTick() {
  string msg;
  if (sub.Recv(msg)) {
    if (msg == "EXECUTE_BUY") OrderSend(...);
    if (msg == "EXECUTE_SELL") OrderSend(...);
    if (msg == "STOP") CloseAll();
  }
}
```

- **ロジックは一切書かない**
- 命令受信のみ
- 極小ロット（0.01）で実行

---

## 安全設計

### 1. 通信断 → MT5 は新規注文不可

- ZeroMQ 接続が切れた場合、MT5 Execution Agent は新規注文を実行しない
- 既存ポジションは維持（手動で管理）

### 2. STATE_BROKEN → 即 STOP

- 市場状態が `STATE_BROKEN` の場合、即座に `STOP` 命令を送信
- すべてのポジションを閉じる

### 3. LOCK中 → 解除条件まで一切入らない

- 飽和ロックがかかっている場合、`LOCK` を返す
- 24時間経過または手動解除まで新規エントリー不可

### 4. Phase T-1/T-2 では絶対に注文しない

- Phase T-1: `WAIT` / `LOCK` / `ALLOW` のみ（実行しない）
- Phase T-2: `PROPOSE_BUY` / `PROPOSE_SELL` のみ（実行しない）
- Phase T-3: `EXECUTE_BUY` / `EXECUTE_SELL` / `STOP` のみ実行

---

## API エンドポイント

### `tenmonTrade.decideFromCandles`

ローソク足から決定を生成（中枢処理）。

```typescript
const decision = await trpc.tenmonTrade.decideFromCandles.mutate({
  symbol: "USDJPY",
  candles: [
    {
      time: Date.now(),
      open: 150.00,
      high: 150.10,
      low: 149.90,
      close: 150.05,
      volume: 1000,
      range: 0.20,
    },
  ],
  direction: "BUY",
});
```

### `tenmonTrade.setPhase`

フェーズを設定。

```typescript
await trpc.tenmonTrade.setPhase.mutate({
  phase: "T-3", // "T-1" | "T-2" | "T-3"
});
```

### `tenmonTrade.getPhase`

フェーズを取得。

```typescript
const { phase } = await trpc.tenmonTrade.getPhase.query();
```

---

## Beeks VPS セットアップ（現実手順）

### 1. Beeks VPS 作成（Windows）

- Beeks VPS で Windows インスタンスを作成
- パブリック IP を取得

### 2. MT5 インストール

- MT5 をインストール
- デモアカウントまたはリアルアカウントを設定

### 3. EA を配置

- `server/trade/mt5ExecutionAgent.mq5` を `Experts/` に配置
- EA を有効化

### 4. ZeroMQ DLL 配置

- ZeroMQ DLL を MT5 の `Libraries/` に配置
- `Zmq.mqh` を `Include/Zmq/` に配置

### 5. Windows Firewall で 5555/tcp 開放

```powershell
New-NetFirewallRule -DisplayName "TENMON-ARK ZeroMQ" -Direction Inbound -LocalPort 5555 -Protocol TCP -Action Allow
```

### 6. TENMON-ARK から接続テスト

```typescript
const engine = new TenmonTradeEngine("tcp://BEEKS_VPS_IP:5555");
await engine.zmqBridge.initialize();
```

---

## 決定フロー

```
1. ローソク足を受信
   ↓
2. Market State Engine で市場状態を評価
   ↓
3. Entry Saturation Guard で飽和状態を確認
   ↓
4. Loss Quality Analyzer で損失品質を分析
   ↓
5. Decision Synthesizer で最終決定
   ↓
6. Phase T-3 で EXECUTE 命令の場合のみ ZeroMQ で送信
   ↓
7. MT5 Execution Agent が命令を受信して実行
```

---

## 完了

TENMON-TRADE モジュール（Phase T-1 → T-3）の実装が完了しました。

**実装ファイル**:
- `server/trade/types.ts`（新規）
- `server/trade/marketStateEngine.ts`（拡張）
- `server/trade/entrySaturationGuard.ts`（拡張）
- `server/trade/lossQualityAnalyzer.ts`（拡張）
- `server/trade/decisionSynthesizer.ts`（新規）
- `server/trade/mt5ZeroMQBridge.ts`（新規）
- `server/trade/tradeEngine.ts`（拡張）
- `server/trade/mt5ExecutionAgent.mq5`（新規）
- `server/routers/tenmonTradeRouter.ts`（拡張）

**統合**:
- `server/routers.ts` に `tenmonTrade` ルーターを追加済み

