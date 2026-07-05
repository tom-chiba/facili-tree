import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("トップページに見出しが表示される", () => {
  render(<Home />);

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading).toBeInTheDocument();
  expect(heading).toHaveTextContent("To get started, edit the page.tsx file.");
});
