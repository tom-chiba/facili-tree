import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  // E2E テストのみを対象にする。Vitest のユニットテストとはディレクトリで分離
  testDir: "./e2e",
  // CI では全テストが並列で確実に落ちるよう、test.only の混入を失敗扱いにする
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // テスト実行前に Next.js サーバーを起動する。
  // CI では本番挙動に近づけるため build + start、ローカルでは dev を使う
  webServer: {
    command: isCI ? "pnpm build && pnpm start" : "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
