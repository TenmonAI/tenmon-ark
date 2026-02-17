import type { SpiralMotion } from "./spiral.js";
import { UFK_SCHEMA_VERSION } from "./spiral.js";

export type AmatsuMeta = {
  schemaVersion: typeof UFK_SCHEMA_VERSION;
  evidenceIds?: string[];
};

export type AmatsuCell<T> = {
  fire: number;
  water: number;
  content: T;
  innerCells: AmatsuCell<T>[];
  motionSeq: SpiralMotion[];
  meta: AmatsuMeta;
};
