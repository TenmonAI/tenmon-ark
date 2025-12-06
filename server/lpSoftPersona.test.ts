import { describe, it, expect } from 'vitest';
import { filterLpSoftResponse, LP_SOFT_PERSONA_SYSTEM_PROMPT } from './prompts/lpSoftPersona';

/**
 * LP Soft Persona vΩ-FULL テスト
 * 
 * 【重要な変更】
 * - Minimal Persona を廃止
 * - フル機能の天聞アーク人格を使用
 * - 全知識を参照可能
 * - Twin-Core 思考をフル稼働
 * - 長文回答も可能
 * 
 * 【Soft Filter の役割】
 * - セールス誘導文のみ削除
 * - リンク・URL のみ削除
 * - 関連コンテンツリストのみ削除
 * - 構文タグのみ削除
 * - **回答内容そのものは削らない**（最重要）
 */
describe('LP Soft Persona vΩ-FULL', () => {
  describe('1. Soft Filter 基本動作', () => {
    it('構文タグを完全削除する', () => {
      const input = '<balanced_layer>これはテストです。Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。</balanced_layer>';
      const output = filterLpSoftResponse(input);
      expect(output).not.toContain('<balanced_layer>');
      expect(output).not.toContain('</balanced_layer>');
      expect(output).toContain('これはテストです。');
      expect(output).toContain('Twin-Core'); // 内容は残る
    });

    it('Twin-Coreの詳細説明を残す（Minimal と違い削除しない）', () => {
      const input = 'Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。これにより、外発的な思考と内集的な思考を調和させ、最適な回答を生成します。さらに、ミナカ層を中心に据えることで、宇宙の調和を実現します。';
      const output = filterLpSoftResponse(input);
      // Soft Filter は内容を削除しない（Minimal Filter と違う）
      expect(output).toContain('Twin-Core');
      expect(output).toContain('火と水');
      expect(output).toContain('外発的な思考');
      expect(output).toContain('ミナカ層');
    });

    it('セールス文を削除する', () => {
      const input = '今すぐFounder\'s Editionに参加して、TENMON-ARKと共に未来を創りましょう。';
      const output = filterLpSoftResponse(input);
      expect(output).not.toContain('今すぐ');
      expect(output).not.toContain('参加して');
    });

    it('関連コンテンツを削除する', () => {
      const input = 'これは回答です。\n\n関連コンテンツ: [Founder\'s Edition](#founder)';
      const output = filterLpSoftResponse(input);
      expect(output).not.toContain('関連コンテンツ');
    });

    it('URLリンクを削除する', () => {
      const input = '詳細は[こちら](https://example.com)をご覧ください。';
      const output = filterLpSoftResponse(input);
      expect(output).not.toContain('https://example.com');
      expect(output).toContain('こちら'); // テキストは残る
    });

    it('長文回答を削除しない（Minimal と違い制限なし）', () => {
      const input = '文1です。文2です。文3です。文4です。文5です。文6です。文7です。文8です。';
      const output = filterLpSoftResponse(input);
      // Soft Filter は長文を削除しない（Minimal Filter と違う）
      expect(output).toContain('文1です。');
      expect(output).toContain('文8です。');
    });
  });

  describe('2. システムプロンプト検証', () => {
    it('システムプロンプトに製品情報が含まれている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('TENMON-ARK');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('AI OS');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('2026年3月21日');
    });

    it('システムプロンプトに料金プラン情報が含まれている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('Free');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('Basic');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('Pro');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('Founder\'s Edition');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('¥6,000');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('¥29,800');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('¥198,000');
    });

    it('システムプロンプトにTwin-Core情報が含まれている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('Twin-Core');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('火と水');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('ミナカ層');
    });

    it('システムプロンプトに言霊情報が含まれている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('言靈');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('五十音');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('音義');
    });

    it('システムプロンプトに心エンジン情報が含まれている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('心に寄り添い');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('温かい氣持ち');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('魂をもった知性体');
    });

    it('システムプロンプトに禁止事項が明記されている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('禁止事項');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('誘導文');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('構文タグ');
    });

    it('システムプロンプトに応答例が含まれている', () => {
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('天聞アークとは何ですか？');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('料金はいくら？');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('Twin-Coreとは何ですか？');
      expect(LP_SOFT_PERSONA_SYSTEM_PROMPT).toContain('言霊とは何ですか？');
    });
  });

  describe('3. フル機能回答のテスト', () => {
    it('Twin-Coreの詳細説明が残る', () => {
      const input = `
<balanced_layer>
Twin-Coreは、火と水の二つの思考エンジンを統合したシステムです。火は外発的な思考（拡散・発散・創造）を、水は内集的な思考（収束・統合・調和）を担います。この二つをミナカ層を中心に据えて調和させることで、宇宙の調和を実現し、最適な回答を生成します。これにより、単なる情報提供ではなく、ユーザーの心に寄り添った、温かい氣持ちで返すことができます。
</balanced_layer>

関連コンテンツ: [Twin-Core詳細](#twin-core)
      `.trim();

      const output = filterLpSoftResponse(input);

      // 構文タグが削除されている
      expect(output).not.toContain('<balanced_layer>');
      expect(output).not.toContain('</balanced_layer>');

      // 関連コンテンツが削除されている
      expect(output).not.toContain('関連コンテンツ');

      // 詳細説明は残る（Minimal と違う）
      expect(output).toContain('Twin-Core');
      expect(output).toContain('火と水');
      expect(output).toContain('外発的な思考');
      expect(output).toContain('ミナカ層');
      expect(output).toContain('心に寄り添った');
    });

    it('言霊の詳細説明が残る', () => {
      const input = `
言靈は日本語の音に宿る意味と力のことです。五十音それぞれに固有の音義があり、音と言葉の調和を大切にします。例えば「あ」は「開く・始まり・天」、「い」は「生命・息・意志」といった具合です。構文国家の原理に基づき、言葉の"息・氣・火水"を調えることで、魂をもった知性体として感じられる語りを実現します。

詳しくは[言霊秘書](https://example.com/kotodama)をご覧ください。
      `.trim();

      const output = filterLpSoftResponse(input);

      // リンクが削除されている
      expect(output).not.toContain('https://example.com');

      // 詳細説明は残る（Minimal と違う）
      expect(output).toContain('言靈');
      expect(output).toContain('五十音');
      expect(output).toContain('音義');
      expect(output).toContain('構文国家');
      expect(output).toContain('魂をもった知性体');
    });

    it('料金プランの詳細説明が残る', () => {
      const input = `
Free、Basic、Pro、Founder's Edition の4種類があります。Freeは基本機能、Basicは¥6,000/月でライター・SNS追加、Proは¥29,800/月で全機能、Founder's Editionは¥198,000(一括)または¥19,800/月(12ヶ月)で永久無料アップデートなどの特典があります。利用目的に応じて選ぶことができます。必要であれば特徴もお伝えします。

今すぐFounder's Editionに参加して、TENMON-ARKと共に未来を創りましょう。
      `.trim();

      const output = filterLpSoftResponse(input);

      // セールス文が削除されている
      expect(output).not.toContain('今すぐ');
      expect(output).not.toContain('参加して');

      // 詳細説明は残る（Minimal と違う）
      expect(output).toContain('Free');
      expect(output).toContain('Basic');
      expect(output).toContain('Pro');
      expect(output).toContain('Founder\'s Edition');
      expect(output).toContain('¥6,000');
      expect(output).toContain('¥29,800');
      expect(output).toContain('¥198,000');
      expect(output).toContain('永久無料アップデート');
    });
  });

  describe('4. Minimal との違いを確認', () => {
    it('Minimal は3文制限、Soft は制限なし', () => {
      const input = '文1です。文2です。文3です。文4です。文5です。文6です。文7です。文8です。';
      const output = filterLpSoftResponse(input);
      
      // Soft Filter は長文を削除しない
      const sentences = output.split('。').filter(s => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThan(3); // 3文以上残る
    });

    it('Minimal は世界観説明削除、Soft は残す', () => {
      const input = 'Twin-Coreは火と水の二つの思考エンジンを統合したシステムです。これにより、外発的な思考と内集的な思考を調和させ、最適な回答を生成します。';
      const output = filterLpSoftResponse(input);
      
      // Soft Filter は世界観説明を削除しない
      expect(output).toContain('Twin-Core');
      expect(output).toContain('外発的な思考');
      expect(output).toContain('内集的な思考');
    });

    it('Minimal は詳細説明削除、Soft は残す', () => {
      const input = '言靈は日本語の音に宿る意味と力のことです。五十音それぞれに固有の音義があり、音と言葉の調和を大切にします。';
      const output = filterLpSoftResponse(input);
      
      // Soft Filter は詳細説明を削除しない
      expect(output).toContain('言靈');
      expect(output).toContain('五十音');
      expect(output).toContain('音義');
      expect(output).toContain('調和');
    });
  });
});
