/**
 * Phase C: 旧天聞AIコア記憶移植スクリプト
 * 
 * このスクリプトは tenmon-memory-export.json から
 * TENMON-ARK の新しいデータベーススキーマに記憶を移植します。
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  longTermMemories,
  mediumTermMemories,
  chatRooms,
  chatMessages,
  developerKnowledge,
} from '../drizzle/schema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// データベース接続
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 記憶エクスポートファイルを読み込み
const exportFilePath = '/home/ubuntu/upload/tenmon-memory-export.json';
console.log(`📂 Loading memory export from: ${exportFilePath}`);

const exportData = JSON.parse(readFileSync(exportFilePath, 'utf-8'));

console.log('\n=== 旧天聞AIコア記憶移植開始 ===\n');
console.log(`エクスポート日時: ${exportData.metadata.exportDate}`);
console.log(`バージョン: ${exportData.metadata.version}`);
console.log(`説明: ${exportData.metadata.description}\n`);

// 統計情報
const stats = {
  ltm: {
    categories: 0,
    documents: 0,
    developerKnowledge: 0,
  },
  mtm: {
    total: 0,
  },
  stm: {
    conversations: 0,
    messages: 0,
  },
};

/**
 * LTM（Long-Term Memory）の移植
 * 
 * 旧天聞AIコアの LTM は以下の構造：
 * - categories: カテゴリ（言霊、古事記、仏教、神道、いろは歌、カタカムナ、天津金木、宿曜経、天聞講義）
 * - documents: 文書（霊核知識、構文解析、秘伝文献）
 * 
 * TENMON-ARK の LTM テーブル：
 * - longTermMemories: 永続的な基盤記憶（必須フィールド：memoryType, category）
 * - developerKnowledge: Developer専用Knowledge Base
 */
async function migrateLTM() {
  console.log('🔵 Phase 1: LTM（Long-Term Memory）移植開始\n');
  
  const ltm = exportData.ltm;
  
  // カテゴリ情報を表示
  console.log(`📚 カテゴリ: ${ltm.categories.length}件`);
  ltm.categories.forEach(cat => {
    console.log(`  ${cat.icon} ${cat.name} (${cat.slug})`);
  });
  stats.ltm.categories = ltm.categories.length;
  
  // 文書を移植
  console.log(`\n📄 文書: ${ltm.documents.length}件`);
  
  for (const doc of ltm.documents) {
    const category = ltm.categories.find(c => c.id === doc.categoryId);
    const categorySlug = category?.slug || 'unknown';
    
    // カテゴリに応じてmemoryTypeとcategoryをマッピング
    let memoryType = 'worldview';
    let categoryEnum = 'worldview';
    
    if (categorySlug === 'amatsukanagi') {
      memoryType = 'tenshin_kinoki';
      categoryEnum = 'tenshin_kinoki';
      console.log(`  ✨ 天津金木: ${doc.title}`);
    } else if (categorySlug === 'kotodama' || categorySlug === 'iroha') {
      memoryType = 'lingua_structure';
      categoryEnum = 'lingua_structure';
      console.log(`  🔮 言霊: ${doc.title}`);
    } else {
      console.log(`  📖 ${category?.name || 'その他'}: ${doc.title}`);
    }
    
    // longTermMemoriesに挿入（Developer user ID = 1）
    await db.insert(longTermMemories).values({
      userId: 1,
      content: doc.content,
      memoryType,
      category: categoryEnum,
      metadata: JSON.stringify({
        title: doc.title,
        summary: doc.summary,
        author: doc.author,
        source: doc.source,
        publishedDate: doc.publishedDate,
        originalId: doc.id,
        originalCategoryId: doc.categoryId,
        originalCategorySlug: categorySlug,
        originalCategoryName: category?.name,
      }),
    });
    
    // developerKnowledgeにも追加（検索用）
    await db.insert(developerKnowledge).values({
      title: doc.title,
      content: doc.content,
      category: categorySlug,
      tags: JSON.stringify([category?.name]),
      metadata: JSON.stringify({
        summary: doc.summary,
        author: doc.author,
        source: doc.source,
      }),
    });
    
    stats.ltm.documents++;
    stats.ltm.developerKnowledge++;
  }
  
  console.log(`\n✅ LTM移植完了: ${stats.ltm.documents}件の文書を移植\n`);
}

/**
 * MTM（Medium-Term Memory）の移植
 * 
 * 旧天聞AIコアの MTM は以下の構造：
 * - eaHistory: EA履歴
 * - tradingStrategies: トレード戦略
 * - terminalLogs: ターミナルログ
 * - tradeResults: トレード結果
 * - pdcaCycles: PDCAサイクル
 * - marketAnalysis: マーケット分析
 * - terminalApiSettings: ターミナルAPI設定
 * - vpsHeartbeats: VPSハートビート
 * - marketData: マーケットデータ
 * - pendingCommands: 保留コマンド
 * - scalpPatterns: スキャルプパターン
 * - tradeHistory: トレード履歴
 * - featureData: 特徴データ
 * - pdcaHistory: PDCA履歴
 * 
 * TENMON-ARK の MTM テーブル：
 * - mediumTermMemories: プロジェクト状況・継続話題（Developer層）
 */
async function migrateMTM() {
  console.log('🟡 Phase 2: MTM（Medium-Term Memory）移植開始\n');
  
  const mtm = exportData.mtm;
  
  let totalMTMEntries = 0;
  
  // 各MTMカテゴリを mediumTermMemories に移植
  for (const [categoryKey, entries] of Object.entries(mtm)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    
    console.log(`📊 ${categoryKey}: ${entries.length}件`);
    
    for (const entry of entries) {
      // 30日後に期限切れ
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      await db.insert(mediumTermMemories).values({
        userId: 1, // Developer user ID
        conversationId: null,
        content: JSON.stringify(entry),
        context: categoryKey,
        importance: 'fire', // MTMは高重要度
        category: 'project_state', // プロジェクト状態として保存
        expiresAt,
      });
      
      totalMTMEntries++;
    }
  }
  
  stats.mtm.total = totalMTMEntries;
  
  console.log(`\n✅ MTM移植完了: ${stats.mtm.total}件のエントリを移植\n`);
}

/**
 * STM（Short-Term Memory）の移植
 * 
 * 旧天聞AIコアの STM は以下の構造：
 * - conversations: 会話セッション
 * - messages: メッセージ履歴
 * - recentConversations: 最近の会話
 * 
 * TENMON-ARK の STM テーブル：
 * - chatRooms: チャットルーム（Public層）
 * - chatMessages: チャットメッセージ（Public層）
 */
async function migrateSTM() {
  console.log('🟢 Phase 3: STM（Short-Term Memory）移植開始\n');
  
  const stm = exportData.stm;
  
  // 会話セッションを移植
  const conversations = stm.conversations || [];
  console.log(`💬 会話セッション: ${conversations.length}件`);
  
  for (const conv of conversations) {
    // 新しいチャットルームを作成
    const [roomResult] = await db.insert(chatRooms).values({
      userId: 1, // Developer user ID
      title: conv.title || `旧天聞AIコア会話 #${conv.id}`,
      createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
      updatedAt: new Date(),
    });
    
    const roomId = Number(roomResult.insertId);
    
    // この会話のメッセージを移植
    const messages = (stm.messages || []).filter(m => m.conversationId === conv.id);
    console.log(`  📝 メッセージ: ${messages.length}件`);
    
    for (const msg of messages) {
      await db.insert(chatMessages).values({
        roomId,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      });
      stats.stm.messages++;
    }
    
    stats.stm.conversations++;
  }
  
  console.log(`\n✅ STM移植完了: ${stats.stm.conversations}件の会話、${stats.stm.messages}件のメッセージを移植\n`);
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    // LTM移植
    await migrateLTM();
    
    // MTM移植
    await migrateMTM();
    
    // STM移植
    await migrateSTM();
    
    // 統計情報を表示
    console.log('\n=== 移植完了統計 ===\n');
    console.log(`🔵 LTM（Long-Term Memory）:`);
    console.log(`  - カテゴリ: ${stats.ltm.categories}件`);
    console.log(`  - 文書: ${stats.ltm.documents}件`);
    console.log(`  - Developer Knowledge: ${stats.ltm.developerKnowledge}件`);
    
    console.log(`\n🟡 MTM（Medium-Term Memory）:`);
    console.log(`  - 総エントリ数: ${stats.mtm.total}件`);
    
    console.log(`\n🟢 STM（Short-Term Memory）:`);
    console.log(`  - 会話: ${stats.stm.conversations}件`);
    console.log(`  - メッセージ: ${stats.stm.messages}件`);
    
    console.log(`\n\n🎉 TENMON-ARKは旧天聞AIコアを完全継承しました 🎉\n`);
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
