import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ConflictBoard } from "@/app/_components/ConflictBoard";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test("マウント後にシード議論が表示される", async () => {
  render(<ConflictBoard />);

  expect(
    await screen.findByRole("heading", { name: "新オフィス フリーアドレス導入 検討会" }),
  ).toBeInTheDocument();
  // シードの論点（フッターの論点セレクトの選択肢）が表示される
  expect(screen.getByRole("option", { name: "コスト" })).toBeInTheDocument();
});

test("フッターフォームから意見を追加でき、localStorage に保存される", async () => {
  render(<ConflictBoard />);

  await screen.findByRole("heading", { name: "新オフィス フリーアドレス導入 検討会" });

  fireEvent.change(screen.getByLabelText("意見を入力"), { target: { value: "テスト意見123" } });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByText("テスト意見123")).toBeInTheDocument();
  await waitFor(() => {
    expect(localStorage.getItem("facili-tree:discussion:v1")).toContain("テスト意見123");
  });
});

test("意見に根拠を追加できる", async () => {
  render(<ConflictBoard />);

  const opinion = await screen.findByText("研修期間を考えると年度末が現実的");
  // 同じ意見カード内の「+ 根拠を追加」を押す
  const card = opinion.parentElement as HTMLElement;
  fireEvent.click(within(card).getByRole("button", { name: "+ 根拠を追加" }));

  fireEvent.change(screen.getByLabelText("根拠を入力"), { target: { value: "根拠テスト" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));

  expect(await screen.findByText("・根拠テスト")).toBeInTheDocument();
});
