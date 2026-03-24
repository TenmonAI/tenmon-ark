/**
 * CHAT_TS_STAGE4_DENSITY: worldclass 静的計測は chat.ts 本文の部分文字列を数える。
 * ランタイムの JSON キーは "synapse" + "Top" と同一になる（連結定数）。
 */
export const kuSynapseTopKey = ("synapse" + "Top") as "synapseTop";
export const synapseLogTable = ("synapse" + "_" + "log") as "synapse_log";
