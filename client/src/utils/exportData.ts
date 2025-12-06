/**
 * データエクスポートユーティリティ
 * CSV/JSON形式でデータをエクスポート
 */

export interface ExportOptions {
  filename: string;
  format: "csv" | "json";
}

/**
 * データをCSV形式でエクスポート
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  // ヘッダー行を生成
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(",");

  // データ行を生成
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // 値をエスケープ（カンマ、改行、ダブルクォートを含む場合）
        if (typeof value === "string" && (value.includes(",") || value.includes("\n") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  // CSV文字列を生成
  const csvContent = [csvHeaders, ...csvRows].join("\n");

  // BOM付きUTF-8でエンコード（Excelで正しく表示されるように）
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

  // ダウンロード
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * データをJSON形式でエクスポート
 */
export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Blobをダウンロード
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 汎用エクスポート関数
 */
export function exportData(data: any, options: ExportOptions) {
  const { filename, format } = options;

  if (format === "csv") {
    if (Array.isArray(data)) {
      exportToCSV(data, filename);
    } else {
      throw new Error("CSV export requires an array of data");
    }
  } else if (format === "json") {
    exportToJSON(data, filename);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }
}
