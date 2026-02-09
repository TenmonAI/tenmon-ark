// Prompt templates for TENMON-ARK mobile.
// UI から直接文字列を組み立てず、必ずこの関数を経由する。

type DiveInParams = {
  doc?: string;
  pdfPage?: number;
};

export function makeDiveInPrompt(params: DiveInParams): string {
  const doc = params.doc ?? "KHS";
  const page = params.pdfPage ?? 1;

  return `doc=${doc} pdfPage=${page} #詳細\nこのページの要点と前後関係を教えてください。`;
}

