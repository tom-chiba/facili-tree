import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("トップページに議論ボードのタイトルが表示される", async () => {
  render(<Home />);

  expect(
    await screen.findByRole("heading", { name: "新オフィス フリーアドレス導入 検討会" }),
  ).toBeInTheDocument();
});
