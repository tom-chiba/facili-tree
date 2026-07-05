import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("トップページに議論ボード（初期は無題）の見出しが表示される", async () => {
  render(<Home />);

  // 永続データが無い初期状態ではタイトルは未設定のためプレースホルダ見出しになる
  expect(await screen.findByRole("heading", { name: "無題の議論" })).toBeInTheDocument();
});
