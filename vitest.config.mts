import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // tsconfig の paths（@/*）を解決する。Vite がネイティブ対応しているため
  // vite-tsconfig-paths プラグインは不要
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // RTL の自動クリーンアップを有効にするため globals を有効化
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // ユニット/コンポーネントテストのみ対象。Playwright の e2e は除外する
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
  },
});
