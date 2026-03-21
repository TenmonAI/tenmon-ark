/**
 * MEMORY_INHERITANCE_RENDERER_V1
 * inheritance_prompt_raw を heuristics で structured フィールドに分解（LLM 不使用）。
 * chat runtime へは渡さない — 保存・プレビュー用のみ。
 */
export const MEMORY_INHERITANCE_RENDERER_V1 = "MEMORY_INHERITANCE_RENDERER_V1" as const;

export type InheritanceStructuredV1 = {
  renderer_version: typeof MEMORY_INHERITANCE_RENDERER_V1;
  ai_naming: string | null;
  user_naming: string | null;
  tone_profile: string;
  persona_core: string;
  forbidden_moves: string[];
  response_format_profile: string;
  inherited_memory_facts: string[];
  /** 0–1 粗い信頼度（ヒット数ベース） */
  parse_confidence: number;
};

function norm(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function cleanLine(s: string): string {
  return s.replace(/^[-*・●]\s*/, "").trim();
}

/** 見出し行: # / ## / ### / 【】 */
function isHeading(line: string): string | null {
  const m = line.match(/^#{1,4}\s+(.+)$/);
  if (m) return m[1].trim();
  const b = line.match(/^【([^】]+)】\s*$/);
  if (b) return b[1].trim();
  return null;
}

function titleBucket(title: string): string | null {
  const t = title.toLowerCase();
  if (/人格|ペルソナ|役割|自己紹介|identity|persona|role|あなたは|you are/.test(title) || /you are/.test(t)) {
    return "persona";
  }
  if (/トーン|口調|スタイル|話し方|tone|style|voice/.test(title)) {
    return "tone";
  }
  if (/禁止|やってはいけない|ng|avoid|forbidden|don't|do not/.test(title)) {
    return "forbidden";
  }
  if (/出力|形式|フォーマット|返答|markdown|json|format|response/.test(title)) {
    return "format";
  }
  if (/メモリ|記憶|事実|好み|前提|facts|preferences|remember|ユーザーについて/.test(title)) {
    return "memory";
  }
  if (/呼称|名前| naming|name/.test(title)) {
    return "naming";
  }
  return null;
}

function extractAiNaming(text: string): string | null {
  const patterns: RegExp[] = [
    /(?:AI|アシスタント|ボット|assistant)の?(?:名前|呼称)(?:は|が|：|:)\s*[「『"']([^」』"'\n]{1,48})[」』"'」]?/i,
    /(?:名前|呼称)(?:は|：|:)\s*[「『"']([^」』"'\n]{1,48})[」』"']?\s*(?:で|と|。|\n)/,
    /\*\*Name\*\*[:：]\s*([^\n]{1,48})/i,
    /Name\s*[:：]\s*([^\n]{1,48})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v.length > 0 && v.length <= 200) return v;
    }
  }
  return null;
}

function extractUserNaming(text: string): string | null {
  const patterns: RegExp[] = [
    /(?:ユーザー|利用者|User)の?(?:名前|呼称)(?:は|が|：|:)\s*[「『"']([^」』"'\n]{1,48})[」』"'」]?/i,
    /(?:私|ユーザー)(?:のこと)?(?:を|は)([^。\n]{1,24})(?:と|って)?呼んで/i,
    /\*\*User\*\*[:：]\s*([^\n]{1,48})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v.length > 0 && v.length <= 200) return v;
    }
  }
  return null;
}

function bulletsFromBlock(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-*・●]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const c = cleanLine(t);
      if (c.length > 1 && c.length < 2000) out.push(c);
    }
  }
  return out;
}

function linesMentioningForbidden(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/禁止|しないで|いけない|避け|NG|avoid|don't|never|must not/i.test(t)) {
      const c = cleanLine(t);
      if (c.length > 2 && c.length < 2000) out.push(c);
    }
  }
  return out;
}

function summarizeTone(block: string): string {
  const t = block.trim().slice(0, 800);
  if (!t) return "";
  const oneLine = t.replace(/\s+/g, " ").slice(0, 400);
  return oneLine;
}

function summarizeFormat(block: string): string {
  const t = block.trim().slice(0, 800);
  return t.replace(/\s+/g, " ").slice(0, 400);
}

/**
 * raw プロンプトを structured に分解する。
 */
export function renderInheritanceStructuredV1(rawInput: string): InheritanceStructuredV1 {
  const raw = norm(rawInput);
  if (!raw) {
    return {
      renderer_version: MEMORY_INHERITANCE_RENDERER_V1,
      ai_naming: null,
      user_naming: null,
      tone_profile: "",
      persona_core: "",
      forbidden_moves: [],
      response_format_profile: "",
      inherited_memory_facts: [],
      parse_confidence: 0,
    };
  }

  const lines = raw.split("\n");
  const sections = new Map<string, string[]>();
  let current = "_default";
  sections.set(current, []);

  for (const line of lines) {
    const h = isHeading(line);
    if (h) {
      const b = titleBucket(h);
      current = b ?? `_h:${h}`;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    sections.get(current)!.push(line);
  }

  const joinBlock = (key: string) => (sections.get(key) ?? []).join("\n").trim();

  let persona_core = joinBlock("persona");
  if (!persona_core && sections.has("_default")) {
    persona_core = joinBlock("_default").slice(0, 4000);
  }
  if (!persona_core) {
    const you = raw.match(/(?:あなたは|you are)\s+([^\n]{20,2000})/i);
    if (you?.[1]) persona_core = you[1].trim().slice(0, 2000);
  }
  if (!persona_core) {
    persona_core = raw.slice(0, 2000);
  }

  const tone_block = joinBlock("tone");
  const tone_profile = summarizeTone(tone_block);

  const format_block = joinBlock("format");
  let response_format_profile = summarizeFormat(format_block);
  if (!response_format_profile && /markdown|マークダウン|箇条書き|JSON|コードブロック/i.test(raw)) {
    const bits: string[] = [];
    if (/markdown|マークダウン/i.test(raw)) bits.push("markdown可");
    if (/JSON/i.test(raw)) bits.push("JSON言及");
    if (/箇条書き/i.test(raw)) bits.push("箇条書き言及");
    response_format_profile = bits.join(" · ");
  }

  let forbidden_moves = bulletsFromBlock(joinBlock("forbidden"));
  if (forbidden_moves.length === 0) {
    forbidden_moves = linesMentioningForbidden(raw).slice(0, 40);
  }
  forbidden_moves = [...new Set(forbidden_moves)].slice(0, 50);

  let inherited_memory_facts = bulletsFromBlock(joinBlock("memory"));
  if (inherited_memory_facts.length === 0) {
    inherited_memory_facts = bulletsFromBlock(raw).filter((l) =>
      /ユーザー|好み|事実|覚えて|前提|prefer|user likes|remember that/i.test(l)
    );
  }
  inherited_memory_facts = [...new Set(inherited_memory_facts)].slice(0, 60);

  let ai_naming = extractAiNaming(raw);
  let user_naming = extractUserNaming(raw);

  const namingBlock = joinBlock("naming");
  if (namingBlock) {
    if (!ai_naming) ai_naming = extractAiNaming(namingBlock);
    if (!user_naming) user_naming = extractUserNaming(namingBlock);
  }

  let hits = 0;
  if (ai_naming) hits++;
  if (user_naming) hits++;
  if (tone_profile.length > 10) hits++;
  if (persona_core.length > 30) hits++;
  if (forbidden_moves.length > 0) hits++;
  if (response_format_profile.length > 5) hits++;
  if (inherited_memory_facts.length > 0) hits++;
  const parse_confidence = Math.min(1, hits / 7);

  return {
    renderer_version: MEMORY_INHERITANCE_RENDERER_V1,
    ai_naming,
    user_naming,
    tone_profile,
    persona_core: persona_core.slice(0, 4000),
    forbidden_moves,
    response_format_profile,
    inherited_memory_facts,
    parse_confidence,
  };
}
