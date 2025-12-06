import { describe, it, expect } from 'vitest';
import { filterLpMinimalResponse, LP_MINIMAL_PERSONA_SYSTEM_PROMPT } from './prompts/lpMinimalPersona';

/**
 * LP Minimal Persona vΩ-LP-IME-ULTIMATE テスト
 * 
 * 修復内容の検証:
 * A-1. 過剰フィルター修正
 * A-2. 本体知識参照可能化
 * A-3. 強化FAQモード
 */
describe('LP Minimal Persona vΩ-LP-IME-ULTIMATE', () => {
  describe('A-1. 過剰フィルター修正', () => {
    it('構文タグを完全削除する', () => {
      const input = '<balanced_layer>これはテストです。</balanced_layer>';
      const output = filterLpMinimalResponse(input);
      expect(output).not.toContain('<balanced_layer>');
      expect(output).not.toContain('</balanced_layer>');
      expect(output).toContain('これはテストです。');
    });

    it('Twin-Coreの簡潔な回答は残す', () => {
      const input = 'Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。';
      const output = filterLpMinimalResponse(input);
      // 50文字以下の簡潔な回答は削除されない
      expect(output).toContain('Twin-Core');
    });

    it('Twin-Coreの詳細説明（50文字以上）は3文以内に制限される', () => {
      const input = 'Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。これにより、外発的な思考と内集的な思考を調和させ、最適な回答を生成します。さらに、ミナカ層を中心に据えることで、宇宙の調和を実現します。';
      const output = filterLpMinimalResponse(input);
      // 3文以内に制限される（文の数を確認）
      const sentences = output.split('。').filter(s => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    });

    it('セールス文を削除する', () => {
      const input = '今すぐFounder\'s Editionに参加して、TENMON-ARKと共に未来を創りましょう。';
      const output = filterLpMinimalResponse(input);
      expect(output).not.toContain('今すぐ');
      expect(output).not.toContain('参加して');
    });

    it('関連コンテンツを削除する', () => {
      const input = 'これは回答です。\n\n関連コンテンツ: [Founder\'s Edition](#founder)';
      const output = filterLpMinimalResponse(input);
      expect(output).not.toContain('関連コンテンツ');
    });

    it('URLリンクを削除する', () => {
      const input = '詳細は[こちら](https://example.com)をご覧ください。';
      const output = filterLpMinimalResponse(input);
      expect(output).not.toContain('https://example.com');
      expect(output).toContain('こちら'); // テキストは残る
    });

    it('回答を1-3文に制限する', () => {
      const input = '文1です。文2です。文3です。文4です。文5です。文6です。';
      const output = filterLpMinimalResponse(input);
      const sentences = output.split('。').filter(s => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    });
  });

  describe('A-2. 本体知識参照可能化', () => {
    it('システムプロンプトに製品情報が含まれている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('TENMON-ARK');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('AI OS');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('2026年3月21日');
    });

    it('システムプロンプトに料金プラン情報が含まれている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('Free');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('Basic');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('Pro');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('Founder\'s Edition');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('¥6,000');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('¥29,800');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('¥198,000');
    });

    it('システムプロンプトにFounder特典情報が含まれている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('永久無料アップデート');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('Founder専用コミュニティ');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('開発ロードマップへの意見反映権');
    });
  });

  describe('A-3. 強化FAQモード', () => {
    it('システムプロンプトに1-3文制限が明記されている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('1-3文');
    });

    it('システムプロンプトにセールス文禁止が明記されている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('セールス文');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('誘導文');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('禁止');
    });

    it('システムプロンプトにリンク禁止が明記されている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('リンク');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('禁止');
    });

    it('システムプロンプトに応答例が含まれている', () => {
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('天聞アークとは何ですか？');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('料金はいくらですか？');
      expect(LP_MINIMAL_PERSONA_SYSTEM_PROMPT).toContain('いつから開始しますか？');
    });
  });

  describe('フィルター統合テスト', () => {
    it('複数の不要要素を同時に削除する', () => {
      const input = `
<balanced_layer>
Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。

今すぐFounder's Editionに参加して、TENMON-ARKと共に未来を創りましょう。

関連コンテンツ: [Founder's Edition](#founder)

詳細は[こちら](https://example.com)をご覧ください。
</balanced_layer>
      `.trim();

      const output = filterLpMinimalResponse(input);

      // 構文タグが削除されている
      expect(output).not.toContain('<balanced_layer>');
      expect(output).not.toContain('</balanced_layer>');

      // セールス文が削除されている
      expect(output).not.toContain('今すぐ');

      // 関連コンテンツが削除されている
      expect(output).not.toContain('関連コンテンツ');

      // URLリンクが削除されている
      expect(output).not.toContain('https://example.com');

      // 核心情報は残っている
      expect(output).toContain('Twin-Core');
    });

    it('質問に対する核心回答だけを返す（実例）', () => {
      const input = `
<balanced_layer>
Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。

これにより、外発的な思考と内集的な思考を調和させ、最適な回答を生成します。

今すぐFounder's Editionに参加して、TENMON-ARKと共に未来を創りましょう。

関連コンテンツ: [Twin-Core詳細](#twin-core)
</balanced_layer>
      `.trim();

      const output = filterLpMinimalResponse(input);

      // 簡潔な回答のみが残る
      expect(output.length).toBeLessThan(100);
      expect(output).toContain('Twin-Core');
      expect(output).not.toContain('関連コンテンツ');
    });
  });
});
