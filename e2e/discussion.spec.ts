import { expect, test } from "@playwright/test";

test("初期状態は空ボードで、論点を追加すると意見を追加できる", async ({ page }) => {
  await page.goto("/");

  // 初期は無題・空ボード
  await expect(page.getByRole("heading", { name: "無題の議論" })).toBeVisible();
  await expect(page.getByText(/まだ論点がありません/)).toBeVisible();

  // 論点（軸）を追加
  await page.getByRole("button", { name: "＋ 論点を追加" }).click();
  await page.getByLabel("論点の名前を入力").fill("導入スケジュール");
  await page.getByRole("button", { name: "追加", exact: true }).click();

  // 論点追加後に意見フッターが現れる
  await expect(page.getByLabel("意見を入力")).toBeVisible();
});

test("意見を追加するとボードに表示され、リロード後も保持される", async ({ page }) => {
  await page.goto("/");

  // 論点を用意
  await page.getByRole("button", { name: "＋ 論点を追加" }).click();
  await page.getByLabel("論点の名前を入力").fill("座席のルール");
  await page.getByRole("button", { name: "追加", exact: true }).click();

  const opinion = `E2Eテスト意見-${Date.now()}`;
  await page.getByLabel("意見を入力").fill(opinion);
  await page.getByRole("button", { name: "追加", exact: true }).click();

  await expect(page.getByText(opinion)).toBeVisible();

  // リロードしても localStorage から復元される
  await page.reload();
  await expect(page.getByText(opinion)).toBeVisible();
});
