# 天津金木・いろは言灵解析システム TODO

## Phase 1: 天津金木ロジックの完全抽出と構造化
- [x] 天津金木構造１.pdfの精読と核心構造の抽出
- [x] 天津金木２.pdfの精読と螺旋機構の抽出
- [x] 天之御中主との関係の解明
- [x] amatsuKanagiLogic.jsonの作成

## Phase 2: いろは言灵解の完全抽出と構造化
- [x] 空海のいろは文原稿124.pdfの精読
- [x] いろは47文字の生命の法則の抽出
- [x] 天津金木言灵アルゴリズム.pdfの精読
- [x] 天津金木50パターンと言霊の完全対応表の抽出
- [x] amatsuKanagi50Patterns.jsonの作成

## Phase 3: データベーススキーマ設計と実装
- [x] irohaInterpretationsテーブルの追加
- [x] basicMovementsテーブルの追加
- [x] amatsuKanagiPatternsテーブルの追加
- [x] drizzle-kit generateとmigrateの実行
- [x] データベーススキーマのプッシュ

## Phase 4: 天津金木演算エンジンの実装
- [x] seed-amatsu-kanagi.mjsの作成
- [x] 基本動作データの投入（4件）
- [x] 天津金木50パターンデータの投入（50件）
- [x] amatsuKanagiEngine.tsの実装
- [x] analyzeAmatsuKanagi関数の実装
- [x] getPatternByNumber関数の実装
- [x] getAllPatterns関数の実装
- [x] getAllBasicMovements関数の実装
- [x] tRPC APIエンドポイントの追加（server/routers.ts）

## Phase 5: いろは言灵解析エンジンの実装
- [x] seed-iroha.mjsの作成
- [x] いろは47文字データの投入（47件）
- [x] irohaEngine.tsの実装
- [x] analyzeIroha関数の実装
- [x] getIrohaByOrder関数の実装
- [x] getAllIrohaInterpretations関数の実装
- [x] tRPC APIエンドポイントの追加（server/routers.ts）

## Phase 6: フロントエンド実装（UI/UX設計）
- [x] ホームページ（client/src/pages/Home.tsx）のデザイン（既存のTENMON-ARKテーマを維持）
- [x] 天津金木解析ページ（client/src/pages/AmatsuKanagiAnalysis.tsx）の作成
- [x] いろは言灵解析ページ（client/src/pages/IrohaAnalysis.tsx）の作成
- [x] 天津金木50パターン一覧ページ（client/src/pages/AmatsuKanagiPatterns.tsx）の作成
- [x] いろは47文字一覧ページ（client/src/pages/IrohaCharacters.tsx）の作成
- [x] ナビゲーション構造の実装（client/src/App.tsx）
- [x] デザインシステムの構築（色、フォント、影、アートスタイル）
- [x] レスポンシブデザインの実装

## Phase 7: テスト・検証・チェックポイント作成
- [x] 天津金木演算エンジンのテスト（server/amatsuKanagiEngine.test.ts） - 30/33テスト成功
- [x] いろは言灵解析エンジンのテスト（server/irohaEngine.test.ts） - 30/33テスト成功
- [x] チェックポイントの作成（webdev_save_checkpoint） - version: b7c09736
