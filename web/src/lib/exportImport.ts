// Export/Import ユーティリティ

import { dbExportAll, dbImportAll } from "./db";

export async function exportAll() {
  return await dbExportAll();
}

export async function importAll(payload: Parameters<typeof dbImportAll>[0]) {
  return await dbImportAll(payload);
}

export function downloadJson(filename: string, obj: any): void {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const obj = JSON.parse(text);
        resolve(obj);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
