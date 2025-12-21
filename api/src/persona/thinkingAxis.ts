import type { PersonaState } from "./personaState.js";
import type { PersonaInertia } from "./inertia.js";

// CORE-7: 思考軸（内部用、UI/レスポンスには返さない）
// Amatsu-Kanagi (天津金木) 状態遷移エンジン対応
export type ThinkingAxis = "introspective" | "observational" | "constructive" | "executive";

// 思考軸の別名（Amatsu-Kanagi エンジン用）
export type AxisAlias = "observe" | "reflect" | "build" | "act";

/**
 * 思考軸を別名に変換（Amatsu-Kanagi エンジン用）
 */
export function axisToAlias(axis: ThinkingAxis): AxisAlias {
  const mapping: Record<ThinkingAxis, AxisAlias> = {
    observational: "observe",
    introspective: "reflect",
    constructive: "build",
    executive: "act",
  };
  return mapping[axis];
}

/**
 * 別名を思考軸に変換（Amatsu-Kanagi エンジン用）
 */
export function aliasToAxis(alias: AxisAlias): ThinkingAxis {
  const mapping: Record<AxisAlias, ThinkingAxis> = {
    observe: "observational",
    reflect: "introspective",
    build: "constructive",
    act: "executive",
  };
  return mapping[alias];
}

/**
 * CORE-7: 思考軸を決定する
 * 
 * 決定要素：
 * - 直前の persona.mode
 * - CORE-6 の inertia（lastMode / level）
 * - 会話回数（conversation count）
 */
export function determineThinkingAxis(
  currentMode: PersonaState["mode"],
  inertia: PersonaInertia | undefined,
  conversationCount: number
): ThinkingAxis {
  // 会話回数が少ない（5回未満）→ 観察モード
  if (conversationCount < 5) {
    return "observational";
  }

  // silent モードまたは silent の慣性が強い場合 → 内省モード
  if (currentMode === "silent" || (inertia?.lastMode === "silent" && inertia.level >= 0.5)) {
    return "introspective";
  }

  // thinking モードまたは thinking の慣性が強い場合 → 内省モード
  if (currentMode === "thinking" || (inertia?.lastMode === "thinking" && inertia.level >= 0.4)) {
    return "introspective";
  }

  // engaged モードまたは engaged の慣性が強い場合 → 決断モード
  if (currentMode === "engaged" || (inertia?.lastMode === "engaged" && inertia.level >= 0.4)) {
    return "executive";
  }

  // 会話回数が多い（20回以上）→ 構築モード
  if (conversationCount >= 20) {
    return "constructive";
  }

  // デフォルト：観察モード
  return "observational";
}

/**
 * CORE-7: 思考軸に応じて応答文の「構造」だけを微調整する
 * 
 * 語彙は変えない。構造のみを調整する。
 */
export function applyThinkingAxisStructure(
  text: string,
  axis: ThinkingAxis
): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // introspective: 結論を急がない、文を分ける
  if (axis === "introspective") {
    let structured = text;
    
    // 長い文（50文字以上）を「。」で分割して改行を追加
    structured = structured.replace(/([^。]{50,})。/g, (_match, content) => {
      return content + "。\n\n";
    });
    
    // 連続する「。」の間を広げる（ただし既に改行がある場合は変更しない）
    structured = structured.replace(/。([^\n])/g, "。\n$1");
    
    return structured;
  }

  // observational: 確認語を前段に置く
  if (axis === "observational") {
    let structured = text;
    
    // 「確認」「見ると」「調べると」などの確認語が文中にある場合、文頭に移動
    const confirmPatterns = /(確認|見ると|調べると|確認すると|見てみると)/;
    if (confirmPatterns.test(structured)) {
      // 確認語を含む文を抽出して、文頭に配置（簡易版：最初の確認語を見つけて文頭に）
      const matchResult = structured.match(/([^。]*?(?:確認|見ると|調べると|確認すると|見てみると)[^。]*。)/);
      if (matchResult && !structured.startsWith(matchResult[1])) {
        // 確認語を含む文を文頭に移動（簡易実装：構造調整のみ）
        structured = structured.replace(matchResult[1], "");
        structured = matchResult[1] + "\n\n" + structured;
      }
    }
    
    return structured;
  }

  // constructive: 説明を順序立てる
  if (axis === "constructive") {
    let structured = text;
    
    // 番号付きリスト風に整理（「1.」「2.」などのパターンがあれば維持、なければ追加しない）
    // 既存の番号パターンを維持しつつ、改行を整理
    structured = structured.replace(/([0-9一二三四五六七八九十]+[\.。、])/g, "\n$1");
    
    // 連続する改行を2つに統一
    structured = structured.replace(/\n{3,}/g, "\n\n");
    
    return structured;
  }

  // executive: 結論を先頭に出す
  if (axis === "executive") {
    let structured = text;
    
    // 最初の文（「。」まで）を抽出
    const firstSentence = structured.split("。")[0];
    if (firstSentence && firstSentence.length > 0) {
      const rest = structured.substring(firstSentence.length + 1);
      
      // 最初の文が短い（30文字未満）かつ、残りがある場合
      if (firstSentence.length < 30 && rest.trim().length > 0) {
        // 最初の文を結論として強調（改行を追加）
        structured = firstSentence + "。\n\n" + rest;
      }
    }
    
    return structured;
  }

  // デフォルト：そのまま
  return text;
}

/**
 * Amatsu-Kanagi (天津金木) 状態遷移エンジン
 * 
 * 決定論的な状態遷移関数。前の軸を尊重し、入力に基づいて
 * 適切な遷移を決定する。デフォルトは同じ軸に留まる。
 * 
 * ルール:
 * - デフォルト: 同じ軸に留まる
 * - observe → reflect: "why" や reasoning 要求時のみ
 * - reflect → build: "how", "structure", reconstruction 要求時のみ
 * - build → act: execution や decision 要求時のみ
 * - 曖昧な入力: 軸を変更しない
 * - act → observe: 実行完了後（入力が確認や観察を要求する場合）
 * - observe → act: 直接ジャンプ禁止
 * 
 * @param prevAxis 前の思考軸
 * @param input ユーザー入力
 * @param _turnCount 会話ターン数（将来の拡張用、現時点では未使用）
 * @returns 遷移後の思考軸
 */
export function transitionAxis(
  prevAxis: ThinkingAxis,
  input: string,
  _turnCount: number
): ThinkingAxis {
  const normalizedInput = input.toLowerCase().trim();

  // デフォルト: 同じ軸に留まる
  let nextAxis: ThinkingAxis = prevAxis;

  // observe (observational) からの遷移
  if (prevAxis === "observational") {
    // observe → reflect: "why", "なぜ", "理由", "reasoning", "考え", "内省" など
    const reflectTriggers = [
      "why", "なぜ", "理由", "reasoning", "考え", "内省", "reflect",
      "どうして", "なんで", "理由は", "なぜなら", "考える", "思考",
    ];
    if (reflectTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "introspective";
    }
    // observe → act: 直接ジャンプ禁止（build を経由する必要がある）
    // そのため、ここでは act への遷移は処理しない
  }

  // reflect (introspective) からの遷移
  if (prevAxis === "introspective") {
    // reflect → build: "how", "どう", "構造", "structure", "構築", "reconstruction" など
    const buildTriggers = [
      "how", "どう", "構造", "structure", "構築", "reconstruction",
      "どのように", "どうやって", "作り", "設計", "設計", "構成",
      "組み立て", "構築", "再構築",
    ];
    if (buildTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "constructive";
    }
    // reflect → observe: 曖昧な入力や観察要求の場合
    const observeTriggers = [
      "見る", "観察", "確認", "observe", "見て", "見ると", "調べる",
      "確認する", "見てみる", "観測",
    ];
    if (observeTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "observational";
    }
  }

  // build (constructive) からの遷移
  if (prevAxis === "constructive") {
    // build → act: "実行", "実行する", "execution", "decision", "決断", "決定" など
    const actTriggers = [
      "実行", "実行する", "execution", "decision", "決断", "決定",
      "やる", "する", "実行して", "決める", "決定する", "決断する",
      "実行しよう", "実行します", "act", "do it", "go ahead",
    ];
    if (actTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "executive";
    }
    // build → reflect: 再考や内省を要求する場合
    const reflectTriggers = [
      "再考", "考え直す", "内省", "reflect", "考え", "思考",
      "見直す", "再検討",
    ];
    if (reflectTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "introspective";
    }
  }

  // act (executive) からの遷移
  if (prevAxis === "executive") {
    // act → observe: 実行完了後、確認や観察を要求する場合
    const observeTriggers = [
      "確認", "見る", "観察", "observe", "見て", "見ると", "調べる",
      "確認する", "見てみる", "観測", "どうなった", "結果", "完了",
      "終わった", "終了", "done", "finished", "complete",
    ];
    if (observeTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "observational";
    }
    // act → reflect: 実行後の振り返りを要求する場合
    const reflectTriggers = [
      "振り返る", "反省", "内省", "reflect", "考え", "思考",
      "どうだった", "どうか", "評価",
    ];
    if (reflectTriggers.some((trigger) => normalizedInput.includes(trigger))) {
      nextAxis = "introspective";
    }
  }

  // 曖昧な入力の場合: 同じ軸に留まる（nextAxis は既に prevAxis に設定されている）
  // 明示的な遷移トリガーがない場合は、そのまま返す

  return nextAxis;
}

