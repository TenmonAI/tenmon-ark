# REISHŌ MATH CORE — 完全数学モデルドキュメント

## 概要

Reishō Math Core は、TENMON-ARK OS の統一構造アイデンティティ（Unified Structural Identity）を数学的に表現する完全なモデルです。

## 構成要素

### 1. Fire-Water Tensor Model (64次元)

統合火水テンソルモデルは、以下の要素から構成されます：

- **統合言霊ベクトル（17次元）**: `unifiedKotodamaVector`
  - 母音ベクトル（5次元）
  - 子音ベクトル（9次元）
  - 火・水・バランス（3次元）

- **天津金木テンソル（40次元）**: `kanagiTensor4D`
  - 2（左右旋）× 2（内外）× 2（火水）× 5（モーション）= 40次元

- **KanagiState（6次元）**: `kanagiStateVector`
  - L, R, IN, OUT, fire, water

- **Reishō値（1次元）**: `reishoValue`
  - 統合強度

**合計: 64次元**

### 2. Kanagi ODE Model (6次元微分方程式)

天津金木微分方程式モデル：

```
dL/dt =  + water * IN  - fire * OUT
dR/dt =  + fire  * OUT - water * IN
dIN/dt  =  water - fire * L
dOUT/dt =  fire  - water * R
dfire/dt  =  R * OUT - L * IN
dwater/dt =  L * IN  - R * OUT
```

**状態空間**: 6次元（L, R, IN, OUT, fire, water）

**フェーズ**: L-IN, L-OUT, R-IN, R-OUT

### 3. Kotodama Helix Tensor (3D螺旋座標)

五十音螺旋テンソルモデル：

- **螺旋座標（3D）**: (x, y, z)
  - x: 行（0-9）
  - y: 列（0-4）
  - z: 螺旋インデックス（0-49）

- **螺旋中心**: `centroid`
- **螺旋半径**: `radius`
- **螺旋ピッチ**: `pitch`

### 4. Reishō Math Core (統合モデル)

全モデルを統合した73次元の数学コア：

- **tensor64D**: Fire-Water Tensor（64次元）
- **odeState6D**: Kanagi ODE State（6次元）
- **helix3D**: Kotodama Helix（3次元）

**合計: 73次元**

## 使用方法

### 基本的な使用

```typescript
import { buildReishoMathCore } from "./server/reisho/mathCore";

const text = "天聞アークは宇宙構文OSです";
const mathCore = buildReishoMathCore(text, 0.5);

console.log(mathCore.unifiedReishoValue);
console.log(mathCore.unifiedSignature.tensor64D);
```

### Fractal Engine vΩ との接続

```typescript
import { generateReishoMathKernel, connectToFractalEngineVΩ } from "./server/reisho/mathKernel";
import type { UniversalStructuralSeed } from "./kokuzo/fractal/seedV2";

const kernel = generateReishoMathKernel("初期テキスト", 0.5);
const connectedKernel = connectToFractalEngineVΩ(kernel, seed);
```

### Reishō Kernel v2 の使用

```typescript
import { computeReishoSignatureV2, generateReishoKernelWithFractal } from "./server/reisho/reishoKernel";

// v2: Math Core統合版
const signature = computeReishoSignatureV2("テキスト", seed);
console.log(signature.mathCore);

// Fractal Engine接続版
const kernel = generateReishoKernelWithFractal(seed);
```

## 数学的基礎

### Fire-Water Tensor

火水テンソルは、言霊（Kotodama）の構造を64次元のベクトル空間で表現します。

- **正規化**: すべてのベクトルはL2正規化されます
- **統合**: 複数の次元を統合して単一のReishō値を生成

### Kanagi ODE

天津金木微分方程式は、時間発展を記述する6次元の動的システムです。

- **時間ステップ**: `dt = 0.05`（デフォルト）
- **積分**: Runge-Kutta法またはEuler法
- **安定性**: 値は[-1, 1]または[0, 1]の範囲にクランプされます

### Kotodama Helix

五十音螺旋は、音韻の空間的配置を3D座標で表現します。

- **座標系**: 正規化された[0, 1]範囲
- **螺旋パラメータ**: 半径とピッチで特徴付けられます

## 統合Reishō値の計算

統合Reishō値は、3つのモデルの重み付き平均です：

```
unifiedReishoValue = 
  fireWaterTensor.reishoValue * 0.6 +
  kanagiODE.activity * 0.3 +
  kotodamaHelix.average * 0.1
```

## 実装ファイル

- `server/reisho/mathCore.ts`: 数学モデル定義
- `server/reisho/mathKernel.ts`: 実装可能な数学カーネル
- `server/reisho/reishoKernel.ts`: Reishō Kernel v2（統合版）
- `kokuzo/reisho/reishoCore.ts`: 基礎数学関数
- `kokuzo/reisho/kanagiODE.ts`: Kanagi ODE実装

## 関連ドキュメント

- [Reishō Kernel Integration](./REISHO_KERNEL_INTEGRATION.md)
- [Fractal Engine vΩ](./FRACTAL_ENGINE_VΩ.md)
- [Kokūzō Server](./KOKUZO_SERVER.md)

