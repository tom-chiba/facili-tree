import { expect, test } from "@playwright/test";

test("議論ボードのタイトルと意見が表示される", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "新オフィス フリーアドレス導入 検討会" }),
  ).toBeVisible();
  // 論点名はセレクトの選択肢にも現れるため、意見（ボード上に一意）で内容表示を確認する
  await expect(page.getByText("座席数を減らして賃料を下げるべき")).toBeVisible();
});

test("意見を追加するとボードに表示され、リロード後も保持される", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "新オフィス フリーアドレス導入 検討会" }),
  ).toBeVisible();

  const opinion = `E2Eテスト意見-${Date.now()}`;
  await page.getByLabel("意見を入力").fill(opinion);
  await page.getByRole("button", { name: "追加", exact: true }).click();

  await expect(page.getByText(opinion)).toBeVisible();

  // リロードしても localStorage から復元される
  await page.reload();
  await expect(page.getByText(opinion)).toBeVisible();
});
