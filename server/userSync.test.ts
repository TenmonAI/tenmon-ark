/**
 * User-Sync Evolution 永続化テスト
 * 
 * IFE v5.6: User-Sync Evolution の永続化
 * - 火水傾向の保存
 * - 言語癖の保存
 * - 文体の好みの保存
 * - 話題パターンの保存
 * - 思考深度の保存
 * - テンポの保存
 * - 宿曜情報の保存
 * - ユーザーごとに継続学習
 * 
 * 10テスト以上実装
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveUserSyncProfile,
  loadUserSyncProfile,
  updateUserSyncProfile,
  learnFromConversation,
  deleteUserSyncProfile,
  getUserSyncProfileCount,
} from '../lib/intellect/userSyncStore';
import type { UserProfile } from '../lib/intellect/userSync';

describe('User-Sync Evolution 永続化テスト', () => {
  const testUserId = 99999; // テスト用ユーザーID

  // テスト前にプロファイルを削除
  beforeEach(async () => {
    await deleteUserSyncProfile(testUserId);
  });

  it('テスト1: User-Syncプロファイルの保存', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: ['AI', 'OS'],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);

    const loaded = await loadUserSyncProfile(testUserId);
    expect(loaded).toBeDefined();
    expect(loaded?.fireWaterTendency).toBe('balanced');
    expect(loaded?.languageStyle).toBe('丁寧');
    expect(loaded?.thinkingDepth).toBe('medium');
  });

  it('テスト2: User-Syncプロファイルの読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'fire',
      languageStyle: '簡潔',
      textStylePreference: '木（創造）',
      topicPatterns: ['技術', 'プログラミング'],
      thinkingDepth: 'deep',
      tempo: 'fast',
      shukuyoInfo: '亢',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded).toBeDefined();
    expect(loaded?.fireWaterTendency).toBe('fire');
    expect(loaded?.languageStyle).toBe('簡潔');
    expect(loaded?.topicPatterns).toEqual(['技術', 'プログラミング']);
  });

  it('テスト3: User-Syncプロファイルの部分更新', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);

    // 部分更新
    await updateUserSyncProfile(testUserId, {
      fireWaterTendency: 'water',
      thinkingDepth: 'deep',
    });

    const loaded = await loadUserSyncProfile(testUserId);
    expect(loaded?.fireWaterTendency).toBe('water');
    expect(loaded?.thinkingDepth).toBe('deep');
    expect(loaded?.languageStyle).toBe('丁寧'); // 変更されていない
  });

  it('テスト4: 火水傾向の保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'fire',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.fireWaterTendency).toBe('fire');
  });

  it('テスト5: 言語癖の保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: 'カジュアル',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.languageStyle).toBe('カジュアル');
  });

  it('テスト6: 文体の好みの保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '木（創造）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.textStylePreference).toBe('木（創造）');
  });

  it('テスト7: 話題パターンの保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: ['AI', 'OS', '宇宙', '哲学'],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.topicPatterns).toEqual(['AI', 'OS', '宇宙', '哲学']);
  });

  it('テスト8: 思考深度の保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'deep',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.thinkingDepth).toBe('deep');
  });

  it('テスト9: テンポの保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'fast',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.tempo).toBe('fast');
  });

  it('テスト10: 宿曜情報の保存と読み込み', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '亢',
    };

    await saveUserSyncProfile(testUserId, profile);
    const loaded = await loadUserSyncProfile(testUserId);

    expect(loaded?.shukuyoInfo).toBe('亢');
  });

  it('テスト11: 会話履歴からの学習', async () => {
    const userMessage = 'AIの未来について詳しく教えてください。';
    const assistantMessage = 'AIの未来は...';

    await learnFromConversation(
      testUserId,
      userMessage,
      assistantMessage,
      {
        fireWaterBalance: 'fire',
        thinkingDepth: 'deep',
        topicPatterns: ['AI', '未来'],
      }
    );

    const loaded = await loadUserSyncProfile(testUserId);
    expect(loaded).toBeDefined();
    expect(loaded?.fireWaterTendency).toBe('fire');
    expect(loaded?.thinkingDepth).toBe('deep');
    expect(loaded?.topicPatterns).toContain('AI');
    expect(loaded?.topicPatterns).toContain('未来');
  });

  it('テスト12: 継続学習（複数回の会話）', async () => {
    // 1回目の会話
    await learnFromConversation(
      testUserId,
      'AIについて教えてください。',
      'AIは...',
      {
        fireWaterBalance: 'balanced',
        thinkingDepth: 'medium',
        topicPatterns: ['AI'],
      }
    );

    // 2回目の会話
    await learnFromConversation(
      testUserId,
      '宇宙の本質について教えてください。',
      '宇宙の本質は...',
      {
        fireWaterBalance: 'water',
        thinkingDepth: 'deep',
        topicPatterns: ['宇宙', '哲学'],
      }
    );

    const loaded = await loadUserSyncProfile(testUserId);
    expect(loaded).toBeDefined();
    expect(loaded?.fireWaterTendency).toBe('water'); // 最新の傾向
    expect(loaded?.thinkingDepth).toBe('deep'); // 最新の深度
    expect(loaded?.topicPatterns).toContain('AI');
    expect(loaded?.topicPatterns).toContain('宇宙');
    expect(loaded?.topicPatterns).toContain('哲学');
  });

  it('テスト13: User-Syncプロファイルの削除', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);
    await deleteUserSyncProfile(testUserId);

    const loaded = await loadUserSyncProfile(testUserId);
    expect(loaded).toBeNull();
  });

  it('テスト14: User-Syncプロファイル数の取得', async () => {
    const profile: UserProfile = {
      fireWaterTendency: 'balanced',
      languageStyle: '丁寧',
      textStylePreference: '金（理性）',
      topicPatterns: [],
      thinkingDepth: 'medium',
      tempo: 'moderate',
      shukuyoInfo: '角',
    };

    await saveUserSyncProfile(testUserId, profile);

    const count = await getUserSyncProfileCount();
    expect(count).toBeGreaterThan(0);
  });

  it('テスト15: 存在しないユーザーのプロファイル読み込み', async () => {
    const loaded = await loadUserSyncProfile(88888); // 存在しないユーザーID
    expect(loaded).toBeNull();
  });
});
