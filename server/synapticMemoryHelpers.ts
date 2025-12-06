/**
 * Helper functions for Synaptic Memory Engine
 */

import { MemoryContext } from "./synapticMemory";

/**
 * Format memory context into a string for LLM prompt
 */
export function formatMemoryContext(memoryContext: MemoryContext): string {
  let formatted = "";

  // LTM (Long-Term Memory) - 根源的智慧
  if (memoryContext.ltm.length > 0) {
    formatted += "<ltm_foundation>\n";
    memoryContext.ltm.forEach((mem) => {
      formatted += `- ${mem}\n`;
    });
    formatted += "</ltm_foundation>\n\n";
  }

  // MTM (Medium-Term Memory) - 継続的文脈
  if (memoryContext.mtm.length > 0) {
    formatted += "<mtm_context>\n";
    memoryContext.mtm.forEach((mem) => {
      formatted += `- ${mem}\n`;
    });
    formatted += "</mtm_context>\n\n";
  }

  // STM (Short-Term Memory) - 直近の会話
  if (memoryContext.stm.length > 0) {
    formatted += "<stm_recent_conversation>\n";
    memoryContext.stm.forEach((msg) => {
      formatted += `${msg}\n`;
    });
    formatted += "</stm_recent_conversation>\n\n";
  }

  return formatted;
}
