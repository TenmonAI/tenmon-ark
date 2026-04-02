export function projectTenmonResponseSurfaceV1(text: string): string {
  let out = String(text ?? "");
  // Primary strip layer for internal meta leakage words.
  out = out
    .replace(/root_reasoning/gi, "")
    .replace(/truth_structure/gi, "")
    .replace(/center_loss/gi, "")
    .replace(/次観測/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

export const projectResponseSurfaceV1 = projectTenmonResponseSurfaceV1;
