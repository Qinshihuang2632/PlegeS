import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/*
 * 化了个学 · Vite 构建配置
 * ========================
 * 多页应用(MPA)双入口:
 *   - index.html          游戏 SPA(大厅 / 游戏 / 榜单)  → dist/index.html
 *   - admin/index.html    管理后台 SPA(basename=/admin) → dist/admin/index.html
 * 输出到 dist/(wrangler pages 的 pages_build_output_dir), 部署前 npm run build。
 */
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        admin: path.resolve(import.meta.dirname, "admin/index.html"),
      },
      output: {
        manualChunks(id) {
          // 供应商分包: React 全家桶单独一个 chunk, 游戏与管理后台共享缓存
          if (id.includes("node_modules")) {
            if (
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("react/") ||
              id.includes("react.")
            ) {
              return "vendor";
            }
          }
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
