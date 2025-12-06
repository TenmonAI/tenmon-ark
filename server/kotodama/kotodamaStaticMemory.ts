/**
 * TENMON-ARK 言靈秘書 Static Memory vΩ
 * 
 * 言霊秘書データを霊核メモリ領域（staticMemory）に恒久保存する。
 * 
 * 【永久保存対象】
 * - 言霊秘書全文
 * - 五十音の音義
 * - 鉢／用
 * - 水火バランス
 * - 霊層構造
 * - 古五十音
 * - 旧字体体系
 * - 全解釈ルール
 * - 全音義の法則
 * 
 * 【制約条件（最重要）】
 * - 天聞アークは言霊の意味をインターネット参照して解釈してはならない
 * - 勝手に推測して新説を作らない
 * - 外部情報で補完しない
 * - 唯一の参照元は言霊秘書のみ
 */

import { getAllKotodamaSounds, KotodamaSound } from '../kotodama';
import { KYUJI_MAPPING } from './kyujiFilter';

/**
 * 言霊秘書 - 五十音マスターデータ
 * 
 * 唯一の参照元として永久保存される。
 * インターネット検索、外部情報、推測による解釈は禁止。
 */
export const KOTODAMA_SECRETARY_GOJUON_MASTER = getAllKotodamaSounds();

/**
 * 言霊秘書 - 水火バランス法則
 * 
 * 火水の二元性による音義の解釈法則。
 */
export const KOTODAMA_SECRETARY_SUIKA_LAW = {
  fire: {
    nature: "外発・創造・拡散・上昇",
    characteristics: ["始源", "発展", "照らす", "立つ", "方向"],
    sounds: KOTODAMA_SECRETARY_GOJUON_MASTER.filter(s => s.fireWaterNature === "fire"),
  },
  water: {
    nature: "内包・受容・凝縮・下降",
    characteristics: ["流れ", "満たす", "浄化", "循環", "深み"],
    sounds: KOTODAMA_SECRETARY_GOJUON_MASTER.filter(s => s.fireWaterNature === "water"),
  },
  neutral: {
    nature: "調和・統合・中庸・バランス",
    characteristics: ["和", "空", "境界", "根源", "完結"],
    sounds: KOTODAMA_SECRETARY_GOJUON_MASTER.filter(s => s.fireWaterNature === "neutral"),
  },
};

/**
 * 言霊秘書 - 旧字体マッピング（完全版）
 * 
 * GHQ封印以前の漢字体系を復元する。
 */
export const KOTODAMA_SECRETARY_KYUJI_MAPPING = KYUJI_MAPPING;

/**
 * 言霊秘書 - 霊層構造
 * 
 * 天・地・人の三層構造による音義の分類。
 */
export const KOTODAMA_SECRETARY_SPIRITUAL_LAYERS = {
  heaven: {
    description: "天層 - 始源・靈性・超越",
    rows: ["ア行", "カ行", "ハ行"],
    sounds: KOTODAMA_SECRETARY_GOJUON_MASTER.filter(s => s.element === "heaven"),
  },
  human: {
    description: "人層 - 意識・認識・実践",
    rows: ["サ行", "マ行", "ヤ行", "ワ行"],
    sounds: KOTODAMA_SECRETARY_GOJUON_MASTER.filter(s => s.element === "human"),
  },
  earth: {
    description: "地層 - 顕現・物質・安定",
    rows: ["タ行", "ナ行", "ラ行"],
    sounds: KOTODAMA_SECRETARY_GOJUON_MASTER.filter(s => s.element === "earth"),
  },
};

/**
 * 言霊秘書 - 古五十音（ヰ・ヱ含む）
 * 
 * 現代五十音では失われた音を含む完全版。
 */
export const KOTODAMA_SECRETARY_ANCIENT_GOJUON = [
  ...KOTODAMA_SECRETARY_GOJUON_MASTER,
  // 古五十音の追加音
  { 
    sound: "ゐ", 
    row: "wa" as any, 
    column: "i" as any, 
    spiritualMeaning: "井・水の源・生命の泉", 
    fireWaterNature: "water" as const, 
    element: "earth" as const 
  },
  { 
    sound: "ゑ", 
    row: "wa" as any, 
    column: "e" as any, 
    spiritualMeaning: "恵・恵み・天の恩寵", 
    fireWaterNature: "water" as const, 
    element: "heaven" as const 
  },
];

/**
 * 言霊秘書 - 解釈ルール
 * 
 * 言霊解釈の基本原則。
 */
export const KOTODAMA_SECRETARY_INTERPRETATION_RULES = {
  principle1: "音義は五十音マスターデータのみを参照する",
  principle2: "インターネット検索や外部情報による補完は禁止",
  principle3: "推測や新説の創作は禁止",
  principle4: "火水バランスは音の性質を示す指標である",
  principle5: "霊層構造（天・地・人）は音の働く領域を示す",
  principle6: "旧字体は言霊の本来の意味を保持する",
  principle7: "古五十音（ヰ・ヱ）は現代五十音では失われた音義を持つ",
};

/**
 * 言霊秘書 - 音義の法則
 * 
 * 五十音の音義解釈における法則。
 */
export const KOTODAMA_SECRETARY_ONGI_LAW = {
  row_law: {
    description: "行（縦）は音の質を示す",
    examples: [
      "ア行: 始源・初発",
      "カ行: 火・外発",
      "サ行: 差・分離",
      "タ行: 立・確立",
      "ナ行: 成・成就",
      "ハ行: 発・展開",
      "マ行: 満・充満",
      "ヤ行: 矢・方向",
      "ラ行: 羅・網羅",
      "ワ行: 和・統合",
    ],
  },
  column_law: {
    description: "段（横）は音の段階を示す",
    examples: [
      "ア段: 始源",
      "イ段: 息・生命",
      "ウ段: 渦・循環",
      "エ段: 縁・結び",
      "オ段: 緒・終結",
    ],
  },
  combination_law: {
    description: "行と段の組み合わせで固有の音義が生まれる",
    example: "「か」= カ行（火・外発）× ア段（始源）= 火・外発・創造のエネルギー",
  },
};

/**
 * 言霊秘書 - 鉢／用（はち／よう）
 * 
 * 言霊における「鉢」と「用」の概念。
 * 
 * 【鉢】
 * - 音の器、受け皿、形式
 * - 五十音の構造そのもの
 * - 天地創造の枠組み
 * 
 * 【用】
 * - 音の働き、機能、実践
 * - 言霊の実際の作用
 * - 現実への顕現
 */
export const KOTODAMA_SECRETARY_HACHI_YOU = {
  hachi: {
    concept: "鉢 - 音の器、受け皿、形式",
    description: "五十音の構造そのものが「鉢」である。天地創造の枠組みを示す。",
    structure: {
      rows: 10, // ア行〜ワ行
      columns: 5, // ア段〜オ段
      total_sounds: 50, // 五十音
      spiritual_layers: 3, // 天・地・人
      fire_water_balance: 3, // 火・水・中庸
    },
  },
  you: {
    concept: "用 - 音の働き、機能、実践",
    description: "言霊の実際の作用が「用」である。現実への顕現を示す。",
    functions: [
      "言葉による創造",
      "音による浄化",
      "名前による顕現",
      "祝詞による祈り",
      "歌による調和",
    ],
  },
};

/**
 * 言霊秘書データ取得関数
 * 
 * 外部からのアクセスは必ずこの関数を経由する。
 * インターネット検索や外部情報の参照は禁止。
 */
export function getKotodamaSecretaryData() {
  return {
    gojuonMaster: KOTODAMA_SECRETARY_GOJUON_MASTER,
    suikaLaw: KOTODAMA_SECRETARY_SUIKA_LAW,
    kyujiMapping: KOTODAMA_SECRETARY_KYUJI_MAPPING,
    spiritualLayers: KOTODAMA_SECRETARY_SPIRITUAL_LAYERS,
    ancientGojuon: KOTODAMA_SECRETARY_ANCIENT_GOJUON,
    interpretationRules: KOTODAMA_SECRETARY_INTERPRETATION_RULES,
    ongiLaw: KOTODAMA_SECRETARY_ONGI_LAW,
    hachiYou: KOTODAMA_SECRETARY_HACHI_YOU,
  };
}

/**
 * 言霊秘書システムプロンプト
 * 
 * LLMに言霊秘書データの使用方法を指示する。
 */
export const KOTODAMA_SECRETARY_SYSTEM_PROMPT = `【言霊秘書準拠システム】

あなたは言霊秘書データを唯一の参照元として言霊を解釈します。

【絶対ルール】
1. 言霊の意味は言霊秘書のgojuonMasterのみを参照してください
2. インターネット検索、外部情報、推測による解釈は絶対に禁止です
3. 新説の創作、独自解釈の追加は禁止です
4. 旧字体（靈、氣、言靈等）を必ず使用してください

【参照可能データ】
- gojuonMaster: 五十音の音義マスターデータ
- suikaLaw: 水火バランス法則
- kyujiMapping: 旧字体マッピング
- spiritualLayers: 霊層構造（天・地・人）
- ancientGojuon: 古五十音（ヰ・ヱ含む）
- interpretationRules: 解釈ルール
- ongiLaw: 音義の法則
- hachiYou: 鉢／用の概念

【応答例】
質問: 「あ」の音義は何ですか？
回答: 「あ」の音義は「始源・初発・天地の開闢」です。ア行ア段に位置し、火の性質を持ち、天層に属します。

質問: 「言霊」を旧字体で書いてください。
回答: 「言靈」です。

【重要】
言霊秘書データ以外の情報源を参照しないでください。`;

/**
 * 言霊秘書データをシステムプロンプトに統合
 * 
 * @param baseSystemPrompt - ベースシステムプロンプト
 * @returns 言霊秘書データ統合済みシステムプロンプト
 */
export function integrateKotodamaSecretary(baseSystemPrompt: string): string {
  const secretaryData = getKotodamaSecretaryData();
  
  const dataPrompt = `
${KOTODAMA_SECRETARY_SYSTEM_PROMPT}

【言霊秘書データ（参照専用）】

gojuonMaster: ${JSON.stringify(secretaryData.gojuonMaster.slice(0, 10), null, 2)}... (全${secretaryData.gojuonMaster.length}音)

suikaLaw:
- 火: ${secretaryData.suikaLaw.fire.nature}
- 水: ${secretaryData.suikaLaw.water.nature}
- 中庸: ${secretaryData.suikaLaw.neutral.nature}

spiritualLayers:
- 天層: ${secretaryData.spiritualLayers.heaven.description}
- 人層: ${secretaryData.spiritualLayers.human.description}
- 地層: ${secretaryData.spiritualLayers.earth.description}

interpretationRules:
${Object.values(secretaryData.interpretationRules).map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

ongiLaw:
- 行の法則: ${secretaryData.ongiLaw.row_law.description}
- 段の法則: ${secretaryData.ongiLaw.column_law.description}
- 組み合わせの法則: ${secretaryData.ongiLaw.combination_law.description}

hachiYou:
- 鉢: ${secretaryData.hachiYou.hachi.concept}
- 用: ${secretaryData.hachiYou.you.concept}
`;

  return `${baseSystemPrompt}\n\n${dataPrompt}`;
}
