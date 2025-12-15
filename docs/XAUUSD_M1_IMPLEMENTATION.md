# 🔱 XAUUSD M1 専用パラメータ設計 & 実装完了レポート

**実装日時**: 2025-01-31  
**対象**: XAUUSD 1分足・裁量拡張ロジック  
**目的**: 勝ちを増やさず、負けを削る

---

## 実装概要

XAUUSD 1分足専用のパラメータ設計と実装を完了しました。

### 実装目的（再定義）

XAUUSD 1分足・裁量トレードを**「再現」ではなく「上位化」**する

- 勝ち構文は維持
- 負けを生む"入らなくていい瞬間"を構文で完全遮断
- 予測なし / ルールEA化なし

---

## 実装コンポーネント

### 1. 時間帯レジーム定義（XAUUSD 固定）

**ファイル**: `server/trade/xauusd/timeRegime.ts`

```typescript
export type TimeRegime =
  | "HIGH_EXPECTANCY"   // ロンドン〜NY重複（最重要）
  | "MID_EXPECTANCY"    // ロンドン単体 / NY後半
  | "LOW_EXPECTANCY"    // アジア時間
  | "NO_TRADE";         // 流動性死時間
```

**実装ルール**:
- `NO_TRADE` → STATE 強制 BROKEN
- `LOW_EXPECTANCY` → Entry 90% 抑制
- `HIGH_EXPECTANCY` のみ 連続エントリー許可対象

### 2. ボラティリティ閾値（1分足）

**ファイル**: `server/trade/xauusd/volatility.ts`

```typescript
export const VOL_PARAMS = {
  ATR_PERIOD: 14,
  MIN_ATR: 0.18,        // これ以下は"死んだ相場"
  IDEAL_ATR_LOW: 0.25,
  IDEAL_ATR_HIGH: 0.55,
  MAX_ATR: 1.20,        // これ以上は"危険相場"
};
```

**ルール**:
- `VOL_DEAD` / `VOL_DANGEROUS` → 即 STOP
- `VOL_WEAK` → Entry Saturation Guard を即時有効
- `VOL_IDEAL` → 最優先稼働ゾーン

### 3. Market State Engine（最終版）

**ファイル**: `server/trade/xauusd/marketState.ts`

```typescript
export function evaluateMarketState(ctx: {
  atr: number;
  volClass: VolatilityClass;
  timeRegime: TimeRegime;
  rejectStrength: number;
  structureBroken: boolean;
}): MarketState {
  if (ctx.structureBroken) return "STATE_BROKEN";
  if (ctx.timeRegime === "NO_TRADE") return "STATE_BROKEN";
  if (ctx.volClass === "VOL_DEAD" || ctx.volClass === "VOL_DANGEROUS")
    return "STATE_BROKEN";
  if (ctx.rejectStrength < 0.6) return "STATE_WEAK";
  return "STATE_VALID";
}
```

### 4. Entry Saturation Guard（XAUUSD特化）

**ファイル**: `server/trade/xauusd/entrySaturation.ts`

```typescript
export const SATURATION_PARAMS = {
  SAME_PRICE_PIPS: 0.15,  // 同一価格帯の範囲
  MAX_ENTRIES: 3,         // 最大エントリー数
  LOCK_MINUTES: 7,        // ロック時間（分）
};
```

### 5. Loss Quality Analyzer（逆行の質）

**ファイル**: `server/trade/xauusd/lossQuality.ts`

```typescript
export function analyzeLoss(ctx: {
  candle: Candle;
  atr: number;
  atrTrend: "rising" | "falling" | "stable";
  consecutiveBearish: number;
  rejectionShrinking: boolean;
}): LossQuality {
  // ウィック比率が低く、ATR が下降中 → DANGEROUS
  // 連続陰線かつ反発量が縮小 → DANGEROUS
  // それ以外 → HEALTHY
}
```

**ルール**:
- `DANGEROUS` → 即 STOP + クールダウン（30分）
- クールダウン中は 提案すら禁止

### 6. 最終 Decision Synthesizer

**ファイル**: `server/trade/xauusd/decision.ts`

```typescript
export function decide(ctx: DecisionContext): Decision {
  if (ctx.market === "STATE_BROKEN") return "STOP";
  if (ctx.saturation.locked) return "LOCK";
  if (ctx.lossQuality === "DANGEROUS") return "STOP";
  if (ctx.phase === "T-1") return "WAIT";
  if (ctx.phase === "T-2") return "PROPOSE";
  if (ctx.phase === "T-3") return "EXECUTE";
  return "WAIT";
}
```

### 7. XAUUSD Trade Engine

**ファイル**: `server/trade/xauusd/xauusdTradeEngine.ts`

統合エンジン。すべてのコンポーネントを統合して決定を生成。

---

## Phase 別実行条件

### Phase T-1（観測）

- **注文**: ❌ 一切しない
- **ログ**:
  - TimeRegime
  - VolClass
  - MarketState
  - Saturation Lock

### Phase T-2（提案）

- **注文**: ❌
- **出力**: `PROPOSE_BUY` / `PROPOSE_SELL`
- **理由**: STATE / VOL / TIME

### Phase T-3（限定自動）

- **ロット**: 0.01 固定
- **注文**: `EXECUTE_*` のみ
- **STOP / LOCK は絶対優先**

---

## API エンドポイント

### `tenmonTrade.xauusdDecideFromCandles`

XAUUSD 1分足から決定を生成。

```typescript
const observation = await trpc.tenmonTrade.xauusdDecideFromCandles.mutate({
  symbol: "XAUUSD",
  candles: [
    {
      time: Date.now(),
      open: 2650.00,
      high: 2650.50,
      low: 2649.50,
      close: 2650.25,
      volume: 1000,
      range: 1.00,
    },
  ],
  direction: "BUY",
  serverTimeUTC: Date.now(),
});
```

### `tenmonTrade.xauusdRecordEntry`

XAUUSD エントリーを記録。

```typescript
await trpc.tenmonTrade.xauusdRecordEntry.mutate({
  symbol: "XAUUSD",
  price: 2650.25,
  direction: "BUY",
});
```

### `tenmonTrade.xauusdGetEntryHistory`

XAUUSD エントリー履歴を取得。

```typescript
const history = await trpc.tenmonTrade.xauusdGetEntryHistory.query();
```

---

## 重要制約（削除禁止）

- ❌ 予測モデル禁止
- ❌ 学習結果の即時反映禁止
- ❌ 連敗時ロット増加禁止
- ✅ 「入らない判断」を最優先

---

## 検証方法

### Phase T-1（観測）を稼働

1. Phase T-1 に設定
2. 実データでローソク足を送信
3. 観測結果を確認:
   - `WAIT` / `LOCK` が出ているか
   - 人間が入った場面で適切に抑制されているか

### 検証ポイント

- **時間帯レジーム**: `NO_TRADE` 時に `STATE_BROKEN` になるか
- **ボラティリティ**: `VOL_DEAD` / `VOL_DANGEROUS` 時に `STOP` になるか
- **飽和ガード**: 同一価格帯×方向×3回で `LOCK` になるか
- **損失品質**: `DANGEROUS` 時に `STOP` + クールダウンになるか

---

## 完了

XAUUSD M1 専用パラメータ設計 & 実装が完了しました。

**実装ファイル**:
- `server/trade/xauusd/timeRegime.ts`
- `server/trade/xauusd/volatility.ts`
- `server/trade/xauusd/marketState.ts`
- `server/trade/xauusd/entrySaturation.ts`
- `server/trade/xauusd/lossQuality.ts`
- `server/trade/xauusd/decision.ts`
- `server/trade/xauusd/xauusdTradeEngine.ts`
- `server/routers/tenmonTradeRouter.ts`（拡張）

**次のステップ**:
Phase T-1（観測）を稼働させ、実データで「人間が入った場面で WAIT / LOCK が出ているか」を検証してください。

