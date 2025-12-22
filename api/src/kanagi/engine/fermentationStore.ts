import { KanagiFermentationLog } from "../types/fermentation.js";

const fermentationStore = new Map<string, KanagiFermentationLog>();

export function startFermentation(
  sessionId: string,
  log: Omit<KanagiFermentationLog, "enteredAt" | "elapsed" | "state">
) {
  fermentationStore.set(sessionId, {
    ...log,
    enteredAt: Date.now(),
    elapsed: 0,
    state: "FERMENTING",
  });
}

export function updateFermentation(sessionId: string) {
  const log = fermentationStore.get(sessionId);
  if (!log) return;

  log.elapsed = Date.now() - log.enteredAt;
}

export function getFermentation(sessionId: string) {
  const log = fermentationStore.get(sessionId);
  if (!log) return null;

  updateFermentation(sessionId);
  return log;
}

export function releaseFermentation(sessionId: string) {
  const log = fermentationStore.get(sessionId);
  if (!log) return null;

  log.state = "RELEASED";
  fermentationStore.delete(sessionId);
  return log;
}

