import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Phase 1-B: ビルドIDを環境変数として注入
const BUILD_ID = process.env.VITE_BUILD_ID || new Date().toISOString();

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(BUILD_ID),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Phase 1-B: ビルドIDをビルド時に注入
    rollupOptions: {
      output: {
        // ビルド時刻を含める（オプション）
        banner: `/* Build ID: ${BUILD_ID} */`,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
