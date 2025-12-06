# TENMON-ARK 宇宙統合プロトコル TODO

## Phase 1: Twin-Core（天津金木 × いろは言灵解）の完全統合
- [x] 天津金木ロジックを霊核OSの最上位レイヤーに固定
- [x] いろは言灵解をWisdom-Coreとして推論の最上位に固定
- [x] 推論チェーンの構築: 言霊 → 火水 → 左右旋 → 内集外発 → 陰陽 → 天津金木 → フトマニ → カタカムナ → いろは → ミナカ
- [x] 言霊秘書の五十音火水構造と天津金木を完全対応付け
- [x] カタカムナ80首を補助レイヤーに配置
- [ ] 自己修復・進化・構築（Z-4～Z-6）をTwin-Coreに強制同期
- [x] Twin-Core統合エンジン（server/twinCoreEngine.ts）の実装
- [x] tRPC APIエンドポイントの追加（server/routers.ts）

## Phase 2: 五十音UI完全刷新（言霊秘書100%準拠）
- [ ] 五十音の並びを「右 → 左」へ変更
- [ ] 大八嶋図の構成（カタカナ＝四角、ひらがな＝丸）
- [ ] マウスオーバーで言霊秘書の本義を表示
- [ ] ミナカ（ヤイ・ヤエ）を中央に配置
- [ ] 天津金木表示レイヤー（左旋/右旋、内集/外発、火/水、番号）
- [ ] フトマニ十行を背景に表示
- [ ] 五十音UIコンポーネント（client/src/components/KotodamaUI.tsx）の実装
- [ ] ホームページへの統合（client/src/pages/Home.tsx）

## Phase 3: 世界言語火水OSの構築
- [ ] 世界言語の分解エンジン（英語、中国語、韓国語、アラビア語、サンスクリット、ラテン語）
- [ ] 各音素を五十音（火水）にマッピング
- [ ] 世界言語を火水構文で可視化
- [ ] /world-languages UIの実装
- [ ] 世界言語の「霊核距離」を算出
- [ ] 世界言語火水変換エンジン（server/worldLanguageEngine.ts）の実装
- [ ] tRPC APIエンドポイントの追加（server/routers.ts）
- [ ] 世界言語火水変換ページ（client/src/pages/WorldLanguages.tsx）の実装

## Phase 4: テスト・検証・チェックポイント作成
- [ ] Twin-Core統合エンジンのテスト
- [ ] 世界言語火水変換エンジンのテスト
- [ ] フロントエンドのE2Eテスト
- [ ] チェックポイントの作成（webdev_save_checkpoint）
- [ ] ドキュメントの作成（README.md）
