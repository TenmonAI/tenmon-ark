// Shared API types for TENMON-ARK mobile app

export type Candidate = {
  doc?: string;
  snippet?: string;
  pdfPage?: number;
  tags?: string[];
};

export type Evidence = {
  doc?: string;
  quote?: string;
  pdfPage?: number;
};

export type NormalizedChatResponse = {
  responseText: string;
  decisionFrame?: unknown;
  candidates: Candidate[];
  evidence: Evidence[];
  raw: unknown;
};

export type ApiErrorKind = "network" | "server" | "parse";

export type ApiError = {
  kind: ApiErrorKind;
  message: string;
  status?: number;
};

