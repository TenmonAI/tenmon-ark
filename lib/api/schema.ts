import { z } from "zod";

// Top-level chat response schema (very tolerant; unknown fields passthrough)

const CandidateItemSchema = z
  .object({
    doc: z.string().optional(),
    snippet: z.string().optional(),
    pdfPage: z.number().optional(),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

const EvidenceItemSchema = z
  .object({
    doc: z.string().optional(),
    quote: z.string().optional(),
    pdfPage: z.number().optional(),
  })
  .passthrough();

export const ChatResponseSchema = z
  .object({
    response: z.string(),
    decisionFrame: z.unknown().optional(),
    candidates: z.array(CandidateItemSchema).optional(),
    evidence: z
      .union([
        z.array(EvidenceItemSchema),
        EvidenceItemSchema,
      ])
      .optional(),
  })
  .passthrough();

export type ChatResponseParsed = z.infer<typeof ChatResponseSchema>;

