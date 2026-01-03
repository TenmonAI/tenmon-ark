// 研究API用の型定義

export type StoredFile = {
  id: string;
  originalName: string;
  storedName: string;
  mime: string;
  size: number;
  sha256: string;
  uploadedAt: string;
  extractedAt?: string;
  analyzedAt?: string;
};

export type PageInfo = {
  page: number;
  textPath: string;
  imagePath: string;
  textPreview: string;
  hasText: boolean;
  hasImage: boolean;
};

export type PagesManifest = {
  version: "R3";
  sourceId: string;
  createdAt: string;
  pageCount: number;
  pages: PageInfo[];
};

export type Rule = {
  title: string;
  rule: string;
  evidence: string;
  note?: string;
};

export type Ruleset = {
  version: "R1" | "R2";
  sourceId: string;
  createdAt: string;
  chunks?: number;
  rules: Rule[];
  emptyReason?: string;
  notes?: string[];
};

export type ExtractResult = {
  ok: boolean;
  id?: string;
  preview?: string;
  used?: "ocr" | "pdftotext-raw" | "pdftotext-layout" | "plain";
  error?: string;
};

export type AnalyzeResult = {
  ok: boolean;
  id?: string;
  ruleset?: Ruleset;
  error?: string;
};

export type BuildPagesResult = {
  ok: boolean;
  id?: string;
  manifest?: PagesManifest;
  error?: string;
};

export type ApproveRulesResult = {
  ok: boolean;
  id?: string;
  approved?: number;
  skipped?: number;
  total?: number;
  error?: string;
};

