/**
 * ============================================================
 *  KOKUZO OFFLINE — Local-First Structural Intelligence OS
 * ============================================================
 * 
 * 完全オフラインでも思考・記憶・会話が止まらない OS
 * ============================================================
 */

export * from "./eventLogStore";
export * from "./snapshotStore";
export * from "./localPersistenceAdapter";
export * from "./offlineStateMachine";
export * from "./syncFabric";
export * from "./snapshotHooks";
export * from "./memoryKernelRestore";
export * from "./seedTreePersonalMode";
export * from "./conversationContext";

export { createEventLogStore } from "./eventLogStore";
export { createSnapshotStore, createSnapshot } from "./snapshotStore";
export {
  LocalPersistenceAdapter,
  GlobalPersistenceAdapter,
  PersistenceAdapterRouter,
} from "./localPersistenceAdapter";
export {
  OfflineStateMachineImpl,
  hookNetworkDisconnect,
  hookLocalMutation,
  hookSuccessfulSync,
} from "./offlineStateMachine";
export { SyncFabricImpl } from "./syncFabric";
export {
  hookSnapshotEvery100Events,
  hookSnapshotOnAppExit,
  hookSnapshotOnPowerInterruptIfAvailable,
} from "./snapshotHooks";
export {
  restoreMemoryKernel,
  restoreMemoryKernelOnBoot,
} from "./memoryKernelRestore";
export {
  buildSeedTreePersonalMode,
} from "./seedTreePersonalMode";
export {
  getConversationContextLocalFirst,
  connectReishoPipelineToLocalKokuzo,
  ensureReasoningEngineIsNetworkAgnostic,
} from "./conversationContext";

