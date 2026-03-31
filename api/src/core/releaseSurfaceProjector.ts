export type ReleaseSurfaceSectionLabel = "起" | "承" | "転" | "結";

export type ReleaseSurfaceProjection = {
  original: string;
  normalized: string;
  isLongForm: boolean;
  sections: string[];
  labels: ReleaseSurfaceSectionLabel[];
};

const LONG_FORM_MIN_CHARS = 500;
const REQUIRED_SECTION_COUNT = 4;
const SECTION_LABELS: ReleaseSurfaceSectionLabel[] = ["起", "承", "転", "結"];

function normalizeInput(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])/u)
    .map((x) => x.trim())
    .filter(Boolean);
}

function ensureMinimumOneSentencePerSection(sections: string[]): string[] {
  const normalized = sections.map((x) => x.trim()).filter(Boolean);
  if (normalized.length !== REQUIRED_SECTION_COUNT) return normalized;
  for (const section of normalized) {
    if (splitSentences(section).length < 1) return [];
  }
  return normalized;
}

function toFourSections(text: string): string[] {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length >= REQUIRED_SECTION_COUNT) {
    return paragraphs.slice(0, REQUIRED_SECTION_COUNT);
  }

  const sentences = splitSentences(text);
  if (sentences.length >= REQUIRED_SECTION_COUNT) {
    const perBucket = Math.ceil(sentences.length / REQUIRED_SECTION_COUNT);
    const grouped: string[] = [];
    for (let i = 0; i < REQUIRED_SECTION_COUNT; i += 1) {
      const chunk = sentences.slice(i * perBucket, (i + 1) * perBucket).join(" ").trim();
      grouped.push(chunk || "。");
    }
    return grouped;
  }

  const padded = [...sentences];
  while (padded.length < REQUIRED_SECTION_COUNT) {
    padded.push("。");
  }
  return padded.slice(0, REQUIRED_SECTION_COUNT);
}

/**
 * 長文（500文字以上）では、起承転結の4段構成を強制する。
 * - 各段は最低1文
 * - 起: 主命題（最初の段落）
 * - 承: 根拠・展開
 * - 転: 別角度・深化
 * - 結: 次の一手または収束
 */
export function releaseSurfaceProjector(input: string): ReleaseSurfaceProjection {
  const normalized = normalizeInput(input);
  const isLongForm = normalized.length >= LONG_FORM_MIN_CHARS;

  if (!isLongForm) {
    return {
      original: input,
      normalized,
      isLongForm: false,
      sections: normalized ? [normalized] : [],
      labels: normalized ? ["起"] : [],
    };
  }

  const candidateSections = toFourSections(normalized);
  const sections = ensureMinimumOneSentencePerSection(candidateSections);

  if (sections.length !== REQUIRED_SECTION_COUNT) {
    throw new Error("releaseSurfaceProjector: failed to enforce 4-section long-form structure");
  }

  return {
    original: input,
    normalized,
    isLongForm: true,
    sections,
    labels: [...SECTION_LABELS],
  };
}
