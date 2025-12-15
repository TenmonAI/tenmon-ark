# TENMON-ARK デバイス制御ノード拡張 実装可能性レポート
**作成日**: 2025-01-XX  
**目的**: デバイス制御ノード拡張の実装可能性をコードベースと現実的制約で評価

---

## ① 実装完了状況サマリー（結論先出し）

### PHASE 1: Input & File Control Node

**判定**: **部分実装（基盤のみ）**

**根拠**:
- `server/deviceCluster-v3/cursor/cursorRouter.ts` 存在（robotjs実装はTODO）
- `server/deviceCluster-v3/registry/deviceRegistry.ts` 存在（デバイス登録基盤）
- WebSocket基盤は実装済み（`server/_core/websocket.ts`）
- WebRTC実装はstubのみ（`client/src/deviceCluster-v3/discovery/webrtcHandshake.ts`）

**未実装**:
- robotjsによるOS操作（Mac/Windows）
- ローカルデーモン（tenmon-node）
- P2Pファイル転送（WebRTC DataChannel）

---

### PHASE 2: Audio Sync Node

**判定**: **基盤実装済み（拡張可能）**

**根拠**:
- Web Audio API実装済み（`client/src/lib/drone.ts`）
- 低周波ドローン生成実装済み（48Hz sine wave）
- WebSocket基盤実装済み

**未実装**:
- 位相差・遅延補正
- 複数デバイス間の音響同期
- 中央サーバーからの再生命令受信

---

### PHASE 3: 虚空蔵ノード統合

**判定**: **MVP実装済み（拡張必要）**

**根拠**:
- 虚空蔵ノード実装済み（`client/src/lib/kokuzo/`）
- localStorageによる記憶保存実装済み
- 不可逆圧縮実装済み

**未実装**:
- IndexedDB移行
- FileSystem API統合
- OS Storage統合（Mac/Windows）

---

## ② ファイル別 実装状況

### PHASE 1: Input & File Control Node

#### `server/deviceCluster-v3/cursor/cursorRouter.ts`

**存在**: Yes

**実装内容**:
- Express Router実装済み
- 認証チェック実装済み
- `/move`, `/click` エンドポイント定義済み

**問題点**:
- robotjs実装がTODO（コメントアウト）
- OS操作が未実装
- デバイスID検証が未実装

**確認したコード**:
```typescript
// server/deviceCluster-v3/cursor/cursorRouter.ts:36-38
// TODO: robotjs を使って OS のマウス操作を実行
// const robot = require('robotjs');
// robot.moveMouse(x, y);
```

---

#### `server/deviceCluster-v3/registry/deviceRegistry.ts`

**存在**: Yes

**実装内容**:
- デバイス登録・管理機能
- 安全停止フラグ（safeMode）
- 緊急停止機能

**問題点**:
- デバイス検出（mDNS/LAN）が未実装
- デバイス間通信が未実装

---

#### `client/src/deviceCluster-v3/discovery/webrtcHandshake.ts`

**存在**: Yes

**実装内容**:
- WebRTC接続インターフェース定義
- `establishConnection()`, `closeConnection()` 関数定義

**問題点**:
- WebRTC DataChannel実装がstub（TODO）
- P2Pファイル転送が未実装

**確認したコード**:
```typescript
// client/src/deviceCluster-v3/discovery/webrtcHandshake.ts:16-17
export async function establishConnection(deviceId: string): Promise<WebRTCConnection> {
  // TODO: WebRTC DataChannel を実装
```

---

#### `server/deviceCluster-v3/native/nativeSignaling.ts`

**存在**: Yes

**実装内容**:
- WebRTC Signalingインターフェース定義
- `offer`, `answer` 型定義

**問題点**:
- Signaling実装が未実装
- STUN/TURNサーバー設定が未実装

---

#### ローカルデーモン（tenmon-node）

**存在**: No

**実装内容**:
- 未実装

**必要な実装**:
- Node.jsデーモンプロセス
- WebSocket/HTTP APIクライアント
- OS操作API（robotjs等）
- ファイルシステム監視
- 自動起動設定（launchd/systemd）

---

### PHASE 2: Audio Sync Node

#### `client/src/lib/drone.ts`

**存在**: Yes

**実装内容**:
- Web Audio API実装済み
- 低周波ドローン生成（48Hz sine wave）
- `startDrone()`, `stopDrone()`, `isDroneActive()` 関数

**問題点**:
- 位相差・遅延補正が未実装
- 複数デバイス間の同期が未実装
- 中央サーバーからの再生命令受信が未実装

**確認したコード**:
```typescript
// client/src/lib/drone.ts:18-36
export function startDrone(): void {
  if (ctx) return;
  try {
    ctx = new AudioContext();
    osc = ctx.createOscillator();
    gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 48; // 地球的ドローン（低周波）
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
  } catch (error) {
    console.warn('[Drone] Failed to start drone:', error);
  }
}
```

---

#### WebSocket基盤

**存在**: Yes

**実装内容**:
- Socket.IO実装済み（`server/_core/websocket.ts`）
- チャンネル購読機能実装済み

**問題点**:
- 音響同期専用チャンネルが未実装
- 再生命令送信機能が未実装

---

### PHASE 3: 虚空蔵ノード統合

#### `client/src/lib/kokuzo/`

**存在**: Yes

**実装内容**:
- `index.ts`: 記憶保存・想起・要約取得
- `memory.ts`: localStorageによる記憶保存
- `compress.ts`: 不可逆圧縮

**問題点**:
- IndexedDB移行が未実装
- FileSystem API統合が未実装
- OS Storage統合が未実装

**確認したコード**:
```typescript
// client/src/lib/kokuzo/memory.ts:29-36
export async function saveMemory(data: CompressedMemory): Promise<void> {
  try {
    const existing = JSON.parse(localStorage.getItem(DB_KEY) || '[]') as MemoryEntry[];
    existing.push({
      data,
      ts: Date.now(),
    });
    localStorage.setItem(DB_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('[Kokuzo Memory] Failed to save memory:', error);
  }
}
```

---

## ③ 現実的制約と技術的課題

### OS操作（robotjs）

**制約**:
- **Mac**: アクセシビリティ権限が必要（システム設定で手動許可）
- **Windows**: 管理者権限が必要（UAC）
- **Linux**: X11/Wayland環境依存

**技術的課題**:
- robotjsはネイティブモジュール（ビルドが必要）
- セキュリティソフトが誤検知する可能性
- クロスプラットフォーム互換性の問題

**実装可能性**: **中（権限設定が必要）**

---

### WebRTC P2Pファイル転送

**制約**:
- **NAT越え**: STUN/TURNサーバーが必要
- **ファイアウォール**: UDPポート開放が必要
- **データサイズ**: DataChannelは最大64KB/chunk

**技術的課題**:
- 大容量ファイルの分割転送が必要
- 転送失敗時の再試行ロジックが必要
- セキュリティ（暗号化）が必要

**実装可能性**: **高（STUN/TURNサーバー設定が必要）**

---

### ローカルデーモン（tenmon-node）

**制約**:
- **Mac**: launchd設定が必要
- **Windows**: サービス登録が必要
- **Linux**: systemd設定が必要

**技術的課題**:
- 自動起動設定
- プロセス管理（再起動、クラッシュ検知）
- ログ管理

**実装可能性**: **高（OS設定が必要）**

---

### 音響同期（位相差・遅延補正）

**制約**:
- **ネットワーク遅延**: 可変（10ms-500ms）
- **オーディオバッファ**: ブラウザ依存（通常128-512サンプル）
- **クロック同期**: 各デバイスの内部クロックが異なる

**技術的課題**:
- NTP同期（ミリ秒精度）
- オーディオバッファ補正
- 位相差計算（FFT）

**実装可能性**: **中（複雑な計算が必要）**

---

### IndexedDB / FileSystem API / OS Storage

**制約**:
- **IndexedDB**: ブラウザ依存（容量制限あり）
- **FileSystem API**: 実験的機能（Chromeのみ）
- **OS Storage**: ネイティブモジュールが必要

**技術的課題**:
- クロスプラットフォーム互換性
- 容量管理
- パフォーマンス（大量データ）

**実装可能性**: **高（IndexedDB）、中（FileSystem API）、低（OS Storage）**

---

## ④ 通信プロトコル設計

### WebSocket通信（中央サーバー ↔ 端末）

**既存実装**:
- Socket.IO実装済み（`server/_core/websocket.ts`）
- チャンネル購読機能実装済み

**必要な拡張**:
```typescript
// 意図送信（中央 → 端末）
socket.emit('device:command', {
  type: 'cursor:move',
  params: { x: 100, y: 200 },
  deviceId: 'device-123',
});

// 状態報告（端末 → 中央）
socket.emit('device:status', {
  deviceId: 'device-123',
  status: 'online',
  capabilities: ['cursor', 'keyboard', 'audio'],
});
```

---

### WebRTC P2P通信（端末 ↔ 端末）

**既存実装**:
- WebRTC Signalingインターフェース定義済み（`server/deviceCluster-v3/native/nativeSignaling.ts`）

**必要な実装**:
```typescript
// WebRTC DataChannel確立
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

const dataChannel = peerConnection.createDataChannel('file-transfer', {
  ordered: true,
});

// ファイル転送
dataChannel.send(JSON.stringify({
  type: 'file:chunk',
  fileId: 'file-123',
  chunkIndex: 0,
  data: base64Data,
}));
```

---

### HTTP API（ローカルデーモン ↔ 中央サーバー）

**既存実装**:
- Express Router実装済み（`server/deviceCluster-v3/cursor/cursorRouter.ts`）

**必要な拡張**:
```typescript
// ローカルデーモン → 中央サーバー
POST /api/deviceCluster-v3/node/register
{
  deviceId: string;
  capabilities: string[];
  os: 'mac' | 'windows' | 'linux';
}

// 中央サーバー → ローカルデーモン
POST /api/deviceCluster-v3/node/command
{
  deviceId: string;
  command: {
    type: 'cursor:move' | 'keyboard:type' | 'file:sync';
    params: any;
  };
}
```

---

## ⑤ セキュリティ設計

### 認証・認可

**既存実装**:
- tRPC認証実装済み（`protectedProcedure`）
- プラン制限実装済み（Founder/Devのみ）

**必要な拡張**:
- デバイス証明書（デバイスID + 秘密鍵）
- トークンベース認証（JWT）
- デバイス間通信の暗号化（WebRTC DTLS）

---

### データ暗号化

**既存実装**:
- なし（虚空蔵ノードの暗号化は未実装）

**必要な実装**:
- WebRTC DataChannel暗号化（自動）
- ファイル転送時の暗号化（AES-256）
- 記憶データの暗号化（WebCrypto API）

---

### アクセス制御

**既存実装**:
- プラン制限実装済み（`user.plan !== 'founder' && user.plan !== 'dev'`）

**必要な拡張**:
- デバイス許可リスト（ホワイトリスト）
- IPアドレス制限
- レート制限（操作頻度制限）

---

## ⑥ 実装優先順位と工数見積もり

### P0（必須、すぐ実装）

1. **robotjsによるOS操作実装**
   - 場所: `server/deviceCluster-v3/cursor/cursorRouter.ts`
   - 作業: robotjsインストール、マウス・キーボード操作実装
   - 想定工数: 2人日
   - 制約: アクセシビリティ権限設定が必要

2. **ローカルデーモン（tenmon-node）最小実装**
   - 場所: 新規（`tenmon-node/`）
   - 作業: Node.jsデーモン、WebSocket接続、OS操作API
   - 想定工数: 5人日
   - 制約: OS設定（launchd/systemd）が必要

3. **WebRTC P2Pファイル転送実装**
   - 場所: `client/src/deviceCluster-v3/discovery/webrtcHandshake.ts`
   - 作業: DataChannel確立、ファイル分割転送、再試行ロジック
   - 想定工数: 5人日
   - 制約: STUN/TURNサーバー設定が必要

---

### P1（重要、早急に対応）

4. **音響同期（位相差・遅延補正）**
   - 場所: `client/src/lib/drone.ts`
   - 作業: NTP同期、オーディオバッファ補正、位相差計算
   - 想定工数: 3人日
   - 制約: 複雑な計算が必要

5. **IndexedDB移行（虚空蔵ノード）**
   - 場所: `client/src/lib/kokuzo/memory.ts`
   - 作業: localStorage → IndexedDB移行、容量管理
   - 想定工数: 2人日
   - 制約: なし

6. **デバイス検出（mDNS/LAN）**
   - 場所: `server/deviceCluster-v3/discovery/discoveryRouter.ts`
   - 作業: mDNS実装、LANスキャン、デバイス登録
   - 想定工数: 3人日
   - 制約: ネットワーク権限が必要

---

### P2（改善、後回し可）

7. **FileSystem API統合**
   - 場所: `client/src/lib/kokuzo/memory.ts`
   - 作業: FileSystem API統合、ファイル保存
   - 想定工数: 2人日
   - 制約: Chromeのみ対応

8. **OS Storage統合（Mac/Windows）**
   - 場所: 新規（`tenmon-node/storage/`）
   - 作業: ネイティブモジュール、OS Storage API
   - 想定工数: 5人日
   - 制約: ネイティブモジュールビルドが必要

9. **暗号化機能実装**
   - 場所: `client/src/lib/kokuzo/crypto.ts`
   - 作業: WebCrypto API実装、AES-256暗号化
   - 想定工数: 2人日
   - 制約: なし

---

## ⑦ 「今すぐ実装可能か」最終判定

**判定**: **⚠️ 部分実装可能（基盤は完成、拡張が必要）**

**理由**:

1. **基盤は完成** ✅
   - WebSocket基盤実装済み
   - デバイス登録基盤実装済み
   - Web Audio API実装済み
   - 虚空蔵ノード実装済み

2. **OS操作は実装可能** ✅
   - robotjsは利用可能
   - ただし、アクセシビリティ権限設定が必要

3. **P2Pファイル転送は実装可能** ✅
   - WebRTC DataChannelは利用可能
   - ただし、STUN/TURNサーバー設定が必要

4. **ローカルデーモンは実装可能** ✅
   - Node.jsデーモンは実装可能
   - ただし、OS設定（launchd/systemd）が必要

5. **音響同期は複雑** ⚠️
   - 位相差・遅延補正は複雑な計算が必要
   - ただし、実装可能

6. **IndexedDB移行は実装可能** ✅
   - ブラウザ標準API
   - 制約なし

**結論**:
- **基盤は完成している**
- **OS操作、P2Pファイル転送、ローカルデーモンは実装可能**
- **ただし、権限設定・サーバー設定・OS設定が必要**
- **音響同期は複雑だが実装可能**

---

## ⑧ 実装ロードマップ（最短パス）

### Week 1: 基盤拡張

**Day 1-2**: robotjs実装
- robotjsインストール
- マウス・キーボード操作実装
- アクセシビリティ権限設定ガイド作成

**Day 3-5**: ローカルデーモン最小実装
- Node.jsデーモン作成
- WebSocket接続実装
- OS操作API実装
- 自動起動設定（launchd/systemd）

---

### Week 2: P2P通信

**Day 1-3**: WebRTC DataChannel実装
- DataChannel確立
- ファイル分割転送
- 再試行ロジック

**Day 4-5**: STUN/TURNサーバー設定
- STUNサーバー設定（Google STUN）
- TURNサーバー設定（オプション）
- NAT越えテスト

---

### Week 3: 音響同期

**Day 1-2**: NTP同期実装
- NTPクライアント実装
- クロック同期

**Day 3-5**: 位相差・遅延補正実装
- オーディオバッファ補正
- 位相差計算（FFT）
- 複数デバイス間同期

---

### Week 4: 虚空蔵ノード統合

**Day 1-2**: IndexedDB移行
- localStorage → IndexedDB移行
- 容量管理

**Day 3-5**: 暗号化機能実装
- WebCrypto API実装
- AES-256暗号化

---

## ⑨ 技術的制約まとめ

### 必須設定

1. **Mac**: アクセシビリティ権限（システム設定 → セキュリティとプライバシー）
2. **Windows**: 管理者権限（UAC）
3. **STUN/TURNサーバー**: ネットワーク設定
4. **OS設定**: launchd（Mac）/ systemd（Linux）/ サービス（Windows）

### 推奨設定

1. **ファイアウォール**: UDPポート開放（WebRTC用）
2. **NTP同期**: システムクロック同期
3. **SSL証明書**: デバイス証明書（オプション）

---

## ⑩ 補足：コードベース確認結果

### 実装済みファイル

- ✅ `server/deviceCluster-v3/cursor/cursorRouter.ts` - 基盤実装済み（robotjs未実装）
- ✅ `server/deviceCluster-v3/registry/deviceRegistry.ts` - デバイス登録実装済み
- ✅ `server/deviceCluster-v3/discovery/discoveryRouter.ts` - デバイス検出stub
- ✅ `server/deviceCluster-v3/native/nativeSignaling.ts` - WebRTC Signaling定義
- ✅ `client/src/deviceCluster-v3/discovery/webrtcHandshake.ts` - WebRTC接続stub
- ✅ `client/src/lib/drone.ts` - Web Audio API実装済み
- ✅ `server/_core/websocket.ts` - WebSocket基盤実装済み
- ✅ `client/src/lib/kokuzo/` - 虚空蔵ノード実装済み

### 未実装箇所

- ❌ robotjsによるOS操作
- ❌ ローカルデーモン（tenmon-node）
- ❌ WebRTC DataChannel実装
- ❌ 音響同期（位相差・遅延補正）
- ❌ IndexedDB移行
- ❌ 暗号化機能

---

**レポート完了**

