export type MiniHelperResult = {
  normalizedQuery: string;
  tags: string[];
  hints: string[];
};

export function emptyMiniHelper(): MiniHelperResult {
  return { normalizedQuery: "", tags: [], hints: [] };
}

