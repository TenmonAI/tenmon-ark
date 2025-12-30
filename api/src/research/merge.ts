type Rule = { title: string; rule: string; evidence: string; note?: string };

export function normalizeRule(r: any): Rule | null {
  if (!r) return null;
  const title = String(r.title ?? "").trim();
  const rule = String(r.rule ?? "").trim();
  const evidence = String(r.evidence ?? "").trim();
  const note = r.note ? String(r.note).trim() : undefined;
  if (!title || !rule || !evidence) return null;
  return { title, rule, evidence, note };
}

export function dedupeRules(rules: Rule[]): Rule[] {
  // 同一 rule をまとめる（evidenceは最初のものを採用）
  const map = new Map<string, Rule>();
  for (const r of rules) {
    const key = r.rule;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

