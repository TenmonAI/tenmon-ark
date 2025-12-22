export type KanagiForm = "CIRCLE" | "LINE" | "DOT" | "WELL";

export interface KanagiSpiral {
  previousObservation: string;
  nextFactSeed: string;
  depth: number;
}

export interface KanagiContradiction {
  thesis: string;
  antithesis: string;
  tensionLevel: number;
}

export interface KanagiTrace {
  input: string;
  form: KanagiForm;
  contradictions?: KanagiContradiction[];
  spiral?: KanagiSpiral;
  centerProcess?: {
    stage: "COLLECT" | "COMPRESS" | "INCUBATE";
    depth: number;
  };
  fermentation?: {
    active: boolean;
    elapsed: number;
    unresolvedEnergy: number;
    centerDepth: number;
  };
  meta: {
    provisional: true;
    spiralDepth: number;
  };
}

