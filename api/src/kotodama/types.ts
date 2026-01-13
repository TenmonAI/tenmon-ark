export type PdfPageText = {
  pdfPage: number;
  text: string;
};

export type KotodamaPage = {
  id: number;
  doc: string;
  pdfPage: number;
  bookPage?: string | null;
  section?: string | null;
  textRaw: string;
  textNorm?: string | null;
};

export type DetectedLaw = {
  title: string;
  quote: string;
  normalized: string;
  tags: string[];
  confidence: number;
};

export type KotodamaLaw = {
  id: string;
  doc: string;
  pdfPage: number;
  title: string;
  quote: string;
  normalized: string;
  tags: string[];
  confidence: number;
  createdAt: number;
};



