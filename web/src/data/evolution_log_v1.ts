/**
 * 進化ログ静的データ V1 (Phase α)
 *
 * Founder 向け公開ログ。
 * - 内部用語 (commit hash / Master Card / Phase / 内部モジュール名) は含めない
 * - 数字 (件数 / 割合) は UI に出さない
 * - 「複数の Founder の声をもとに」表現を含む
 *
 * 編集ガイドライン: TENMON 確定文言を尊重し、技術詳細は context に滲ませる程度に留める。
 */

export type EvolutionLogBadge = "改善" | "整備" | "新規";

export interface EvolutionLogEntry {
  id: string;
  emoji: string;
  title: string;
  date: string; // YYYY-MM-DD
  badge: EvolutionLogBadge;
  summary: {
    description: string;
    context?: string;
    tryItExample?: string;
    tryItDescription?: string;
  };
}

export const evolutionLogV1: EvolutionLogEntry[] = [
  {
    id: "evo-2026-04-25-constitution-memory-projection",
    emoji: "✨",
    title: "言霊憲法が会話により深く反映されるようになりました",
    date: "2026-04-25",
    badge: "改善",
    summary: {
      description:
        "言霊憲法 V1 の本文に加えて、記憶層に蒸留された 12 条の要点も会話へ届くようになりました。",
      context:
        "これにより、「分母の固定」「五十連十行」「ヰ・ヱを欠損扱いにしない」といった概念について、より安定して深く答えられる土台が整いました。",
      tryItExample: "言霊憲法の分母の固定とは？",
    },
  },
  {
    id: "evo-2026-04-25-constitution-memory-distill",
    emoji: "✨",
    title: "言霊憲法が記憶層にも定着しました",
    date: "2026-04-25",
    badge: "改善",
    summary: {
      description:
        "天聞アークは、言霊憲法 V1 の 12 条を記憶層にも保持できるようになりました。",
      context:
        "これにより、言霊の五十音構造、ヰ・ヱの保持、正典分母の考え方を、より安定して参照できる土台が整いました。",
    },
  },
  {
    id: "evo-2026-04-25-constitution-promotion",
    emoji: "✨",
    title: "言霊憲法の本文に基づいて答えられるようになりました",
    date: "2026-04-25",
    badge: "改善",
    summary: {
      description:
        "「言霊憲法 V1 第 4 条は何ですか？」と聞いたとき、天聞アークが本文に基づいて「ヰ・ヱを欠損扱いにしない」という原則を答えられるようになりました。",
      context:
        "これにより、言霊の五十音構造やヰ・ヱの保持について、より正確に応答できる土台が整いました。",
      tryItExample: "言霊憲法 V1 第 4 条は何ですか？",
    },
  },
  {
    id: "evo-2026-04-25-clamp",
    emoji: "✨",
    title: "チャット応答が長く話せるようになりました",
    date: "2026-04-25",
    badge: "改善",
    summary: {
      description:
        "「詳しく解説して」「仕組みを教えて」といった深い問いに対して、回答が途中で切れにくくなりました。",
      context:
        "複数の Founder の声をもとに、長めの説明でも自然に完結するよう調整しています。",
      tryItExample: "カタカムナと言霊秘書の関係を詳しく解説してください",
      tryItDescription:
        "このような問いに、よりまとまった形で答えられるようになっています。",
    },
  },
  {
    id: "evo-2026-04-24-50sounds",
    emoji: "🛠",
    title: "言霊の正典骨格を整えました",
    date: "2026-04-24",
    badge: "整備",
    summary: {
      description:
        "五十連十行の 50 音、ヰ・ヱの位相差を canonical に固定しました。",
    },
  },
  {
    id: "evo-2026-04-24-bridge",
    emoji: "🔗",
    title: "知識の橋渡し経路を整えました",
    date: "2026-04-24",
    badge: "整備",
    summary: {
      description: "言霊と天聞アーク内部の知識経路を正規化しました。",
    },
  },
  {
    id: "evo-2026-04-24-watcher",
    emoji: "🌱",
    title: "正典との一致を常時見守る仕組みを始動",
    date: "2026-04-24",
    badge: "新規",
    summary: {
      description:
        "対話の中で正典と矛盾が起きていないかを、自動で見守る仕組みが動き始めました。",
    },
  },
  {
    id: "evo-2026-04-24-trace",
    emoji: "👁",
    title: "応答の質を測る計測層を追加",
    date: "2026-04-24",
    badge: "整備",
    summary: {
      description:
        "応答がどのような構成で組み立てられているかを観測できるようにしました。これにより継続的な改善が可能になります。",
    },
  },
];
