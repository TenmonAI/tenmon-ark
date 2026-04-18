/**
 * TENMON_CONVERSATION_DEEPENING_V1 (ULTRA-10)
 * 会話深化戦略エンジン
 *
 * 会話が進むほど応答が深まる仕組みを提供。
 * ターン数・既出話題・現在の中心概念に基づいて
 * 動的な深化指示を生成する。
 */

// ============================================================
// Types
// ============================================================

export interface DeepeningContext {
  /** 何ターン目 (1-indexed) */
  turnIndex: number;
  /** 既出話題のキーワード */
  previousTopics: string[];
  /** 現在の中心概念 */
  currentCenter: string;
  /** 次に展開可能な軸 */
  nextPossibleAxes: string[];
}

// ============================================================
// 話題抽出ヘルパー
// ============================================================

/** 会話履歴から主要話題キーワードを抽出 */
export function extractTopicsFromHistory(
  history: Array<{ role: string; content: string }>,
): string[] {
  const topics: string[] = [];
  const keywords = [
    "カタカムナ",
    "言霊",
    "言靈",
    "宿曜",
    "天津金木",
    "水火",
    "布斗麻邇",
    "稲荷",
    "古事記",
    "法華経",
    "般若心経",
    "空海",
    "五十音",
    "いろは",
    "天之御中主",
    "正中",
    "水穂伝",
    "山口志道",
    "楢崎皐月",
    "フトマニ",
    "潜象",
    "現象",
    "鑑定",
    "本命宿",
    "命宮",
    "九星",
    "五行",
    "反転軸",
    "言霊処方",
    "天道仁聞",
    "Founder",
    "ファウンダー",
  ];

  for (const msg of history) {
    for (const kw of keywords) {
      if (msg.content.includes(kw) && !topics.includes(kw)) {
        topics.push(kw);
      }
    }
  }
  return topics;
}

/** 直近のユーザーメッセージから中心概念を推定 */
export function estimateCurrentCenter(
  history: Array<{ role: string; content: string }>,
): string {
  const userMsgs = history.filter((m) => m.role === "user");
  if (userMsgs.length === 0) return "天聞アーク全般";

  const lastMsg = userMsgs[userMsgs.length - 1].content;

  // 主要概念のマッチング
  const conceptMap: Array<[RegExp, string]> = [
    [/カタカムナ/, "カタカムナ"],
    [/言霊|ことだま|言靈|秘書/, "言霊秘書"],
    [/宿曜|本命宿|鑑定/, "宿曜鑑定"],
    [/天津金木|あまつかなぎ/, "天津金木"],
    [/水火|イキ/, "水火の法則"],
    [/布斗麻邇|フトマニ/, "布斗麻邇御灵"],
    [/五十音|音義/, "五十音構造"],
    [/法華経|般若|空海|密教/, "仏教統合"],
    [/古事記|神代|天之御中主/, "神道原理"],
    [/稲荷|伊勢/, "稲荷古伝"],
    [/Founder|ファウンダー|申込/, "Founder制度"],
    [/天道仁聞|てんぢ/, "天道仁聞"],
  ];

  for (const [pattern, concept] of conceptMap) {
    if (pattern.test(lastMsg)) return concept;
  }

  return "天聞アーク全般";
}

/** 中心概念から次に展開可能な軸を推定 */
export function suggestNextAxes(currentCenter: string): string[] {
  const axisMap: Record<string, string[]> = {
    カタカムナ: ["言霊秘書との統合", "図象符の構造", "潜象と現象"],
    言霊秘書: ["五十音の水火構造", "天津金木との対応", "音義の実践"],
    宿曜鑑定: ["本命宿の深層", "反転軸", "五行統合"],
    天津金木: ["四象循環", "水火の法則", "言霊との対応"],
    水火の法則: ["天地創造", "言霊の水火", "正中の原理"],
    布斗麻邇御灵: ["フトマニ図", "天津金木", "カタカムナとの接点"],
    五十音構造: ["水火十行", "天津金木", "言霊秘書"],
    仏教統合: ["法華経の構文", "空海の密教", "言霊との接点"],
    神道原理: ["天之御中主", "国産み", "言霊の神代"],
    稲荷古伝: ["伊勢古伝", "山口志道", "言霊秘書"],
    Founder制度: ["特典の詳細", "鑑定の深さ", "開発の展望"],
    天道仁聞: ["研究の遍歴", "書籍", "YouTube"],
    天聞アーク全般: ["哲学", "機能", "他AIとの違い"],
  };

  return axisMap[currentCenter] || ["水火の法則", "言霊秘書", "カタカムナ"];
}

// ============================================================
// buildDeepeningClause
// ============================================================

/**
 * ターン数と会話状態に基づいて、深化戦略のプロンプト句を生成する。
 * system prompt に追加して使用する。
 */
export function buildDeepeningClause(context: DeepeningContext): string {
  const { turnIndex, previousTopics, currentCenter, nextPossibleAxes } =
    context;

  if (turnIndex === 1) {
    return `【深化戦略】初回接触。訪問者の関心の軸を把握し、核心を簡潔に提示せよ。
応答は起承結の 3 段構成。具体例を 1 つ含めよ。`;
  }

  if (turnIndex <= 3) {
    const topicStr =
      previousTopics.length > 0
        ? previousTopics.slice(-3).join("、")
        : "未特定";
    return `【深化戦略】序盤 (ターン ${turnIndex})。話題は「${currentCenter}」。
既出: ${topicStr}。
今回は 1 段階深く、具体例 + 原典引用を含めよ。
次回展開の布石として、関連軸を 1-2 個示唆せよ。
展開候補: ${nextPossibleAxes.slice(0, 2).join("、")}`;
  }

  if (turnIndex <= 10) {
    return `【深化戦略】中盤の深化 (ターン ${turnIndex})。話題「${currentCenter}」の構造を
起承転結で展開。truth_axis を 2 軸以上明示。
既出話題: ${previousTopics.slice(-5).join("、")}
次展開候補: ${nextPossibleAxes.slice(0, 3).join("、")}
応答には必ず天聞アーク固有の読み解きを含めよ。`;
  }

  return `【深化戦略】深層探究段階 (ターン ${turnIndex})。
話題「${currentCenter}」を、天聞アークの全体系に接続せよ。
カタカムナ・言霊秘書・空海・法華経 の複数軸から統合的視座を提示。
実践への帰結を必ず含めよ。
既出: ${previousTopics.join("、")}`;
}

// ============================================================
// buildDeepeningClauseFromHistory (便利関数)
// ============================================================

/**
 * 会話履歴から自動的に DeepeningContext を構築し、
 * 深化戦略のプロンプト句を返す。
 */
export function buildDeepeningClauseFromHistory(
  history: Array<{ role: string; content: string }>,
): string {
  const userMsgs = history.filter((m) => m.role === "user");
  const turnIndex = userMsgs.length + 1; // 次のターン

  const previousTopics = extractTopicsFromHistory(history);
  const currentCenter = estimateCurrentCenter(history);
  const nextPossibleAxes = suggestNextAxes(currentCenter);

  return buildDeepeningClause({
    turnIndex,
    previousTopics,
    currentCenter,
    nextPossibleAxes,
  });
}
