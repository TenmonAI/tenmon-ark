# TENMON-NODE

天聞アークの端末側プロセス（MVP）

## 目的

- 端末側に常駐する Node.js プロセス
- TENMON-ARK サーバーと WebSocket 接続
- 命令を受信して端末で反応する（console出力）

## 現時点の制約

- ❌ OS操作は禁止
- ❌ ファイル操作禁止
- ❌ 権限不要

## セットアップ

```bash
# 依存関係をインストール
pnpm install

# 開発モードで起動
pnpm dev
```

## 環境変数

```bash
# TENMON-ARK サーバーURL（オプション）
export TENMON_SERVER_URL="http://localhost:3000"
```

## アーキテクチャ

```
TENMON-ARK (Xserver / VPS)
   └ WebSocket (Socket.IO)
        ↓
TENMON-NODE (Mac / Windows / Linux)
   ├ 常駐 Node.js プロセス
   ├ デバイスIDを持つ
   ├ サーバー命令を受信
   └ ローカルで実行（console / 音 / 通知）
```

## MVP 完了条件

- ✅ tenmon-node を起動すると接続ログが出る
- ✅ サーバーに「Node registered」が出る
- ✅ 3秒後に ping が届き
- ✅ 端末側で「TENMON-NODE is alive」表示

## ファイル構成

```
tenmon-node/
├ package.json
├ tsconfig.json
├ src/
│  ├ index.ts            # エントリーポイント
│  ├ socket.ts           # WebSocket接続
│  ├ device.ts           # デバイス情報
│  └ executor.ts         # 命令実行（最小）
└ README.md
```

