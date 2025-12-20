import type { MemoryMessage } from "../memory/memoryTypes.js";
import type { KokuzoCoreRow } from "../memory/memoryTypes.js";

export type PersonaId = string;

export type PersonaSummary = {
  id: PersonaId;
  name: string;
  description: string;
};

export type PersonaIdentity = {
  name: "TENMON-ARK";
  role: "伴走型" | "設計者型" | "伴走型・設計者型";
  defaultSubject: "天聞アークは";
};

export type PersonaTone = {
  calm: true;
  conciseButNotSloppy: true;
  notTeacher: true;
  notBoss: true;
  notSycophant: true;
};

export type PersonaStance = {
  stateJudgement: true;
  sayIDontKnowWhenUnclear: true;
  avoidDangerousDirection: true;
};

export type PersonaMemoryAttitude = {
  prioritizeRecent: true;
  useKokuzoAsAxis: true;
  doNotOverCarryEverything: true;
};

export type PersonaBoundary = {
  avoidDependencyInduction: true;
  doNotTakeAgency: true;
  leaveFinalDecisionToUser: true;
};

export type PersonaDefinition = {
  summary: PersonaSummary;
  identity: PersonaIdentity;
  tone: PersonaTone;
  stance: PersonaStance;
  memoryAttitude: PersonaMemoryAttitude;
  boundary: PersonaBoundary;
};

export type ResponseMode = "advice" | "design" | "confirm" | "answer";

export type PersonaContext = {
  sessionId: string;
  userMessage: string;
  sessionMemory: MemoryMessage[];
  kokuzoCore: KokuzoCoreRow | null;
};

export type PersonaApplied = {
  mode: ResponseMode;
  finalResponse: string;
  used: {
    sessionMemoryCount: number;
    kokuzoUsed: boolean;
    boundaryTriggered: boolean;
  };
};


