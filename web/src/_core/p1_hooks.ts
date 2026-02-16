/**
 * P1-2b: Window hooks for Export/Import (terminal-only friendly).
 *
 * Exposes:
 *   - window.tenmonP1Export(): triggers JSON download via existing exportForDownload()
 *   - window.tenmonP1Dump(): returns the JSON object (no download)
 *   - window.tenmonP1Import(json): imports (overwrite) and reloads
 *
 * Notes:
 * - Uses dynamic import to avoid import order issues.
 * - Idempotent install (won't re-install).
 */
declare global {
  interface Window {
    tenmonP1Export?: () => Promise<void>;
    tenmonP1Dump?: () => Promise<any>;
    tenmonP1Import?: (json: any) => Promise<void>;
  }
}

export function installTenmonP1Hooks() {
  if (typeof window === "undefined") return;
  if (window.tenmonP1Export || window.tenmonP1Import || window.tenmonP1Dump) return;

  window.tenmonP1Dump = async () => {
    const mod = await import("../lib/exportImport");
    return mod.exportForDownload();
  };

  window.tenmonP1Export = async () => {
    const data = await window.tenmonP1Dump!();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `tenmon-ark-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  window.tenmonP1Import = async (json: any) => {
    const mod = await import("../lib/exportImport");
    await mod.importOverwrite(json);
    // Same behavior as UI: reload to rehydrate UI from IDB
    location.reload();
  };
}
