import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// ESM で __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** client バンドルから `server/kokuzo/offline/*` を除外し、ブラウザ用スタブへ集約 */
function kokuzoOfflineClientStubPlugin(): Plugin {
  const stubAbs = path.resolve(
    __dirname,
    "src/lib/offline/kokuzoOfflineClientStub.ts",
  );
  return {
    name: "kokuzo-offline-client-stub",
    enforce: "pre",
    resolveId(id, importer) {
      if (id.startsWith("\0")) return null;
      const resolved = path.isAbsolute(id)
        ? id
        : importer
          ? path.resolve(path.dirname(importer), id)
          : id;
      const norm = resolved.replace(/\\/g, "/");
      if (norm.includes("/server/kokuzo/offline/")) {
        return stubAbs;
      }
      return null;
    },
  };
}

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [kokuzoOfflineClientStubPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
