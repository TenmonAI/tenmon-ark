import { normalizeProviderPlan, type ProviderPlan } from "./providerPlan.js";

export function renderWithGpt54(input: {
  response: string;
  providerPlan: any;
}): { response: string; providerPlan: ProviderPlan } {
  return {
    response: String(input.response || ""),
    providerPlan: normalizeProviderPlan(input.providerPlan),
  };
}

