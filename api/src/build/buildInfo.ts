/**
 * Build-time metadata injected at compile.
 * Consumed by selfBuildSupervisorCycleCoreV1 and audit route.
 */

export const BUILD_MARK: string = process.env.BUILD_MARK ?? "dev";

export const BUILD_FEATURES: Record<string, boolean> = {
  koshikiKernel: true,
  sukuyouEngine: true,
  feedbackLoop: true,
  chatFolderOS: true,
  passwordRecovery: true,
};
