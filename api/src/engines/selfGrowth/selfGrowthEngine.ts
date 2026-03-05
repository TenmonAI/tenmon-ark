import { evaluateReward, updateConceptWeight } from "./trainerEngine.js";

export function runSelfGrowth(
  threadId: string,
  heart: any
): number {

  const entropy = heart?.entropy ?? 0.5;

  const clarity =
    entropy < 0.4 ? 1 :
    entropy < 0.7 ? 0.6 : 0.2;

  const resolution =
    entropy < 0.3 ? 1 : 0.5;

  const reward = evaluateReward(entropy, clarity, resolution);

  updateConceptWeight("kanagi", reward);

  return reward;
}
