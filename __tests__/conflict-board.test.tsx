import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ConflictBoard } from "@/app/_components/ConflictBoard";

const STORAGE_KEY = "facili-tree:discussion:v2";
const TITLE = "新オフィス フリーアドレス導入 検討会";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

async function mountBoard() {
  render(<ConflictBoard />);
  await screen.findByRole("heading", { name: TITLE });
}

test("マウント後にシード議論と参加者アバターが表示される", async () => {
  await mountBoard();
  // 論点（フッターの選択肢）
  expect(screen.getByRole("option", { name: "コスト" })).toBeInTheDocument();
  // 参加者アバター A–E
  for (const initial of ["A", "B", "C", "D", "E"]) {
    expect(screen.getByLabelText(`参加者 ${initial}`)).toBeInTheDocument();
  }
});

test("入れ子の子論点とその意見がインデント表示される", async () => {
  await mountBoard();
  // 子論点名はボードとフッター選択肢の両方に現れるため getAllByText で確認
  expect(screen.getAllByText("└ 荷物・私物の管理ルール").length).toBeGreaterThan(0);
  // 子論点内の意見（ボード上に一意）
  expect(screen.getByText("個人ロッカーを増設すべき")).toBeInTheDocument();
});

test("多対立が ⚡ バッジ付きで描画される", async () => {
  await mountBoard();
  // シードの多対立（コスト論点）を含め、⚡ バッジが複数存在する
  const badges = screen.getAllByText("⚡");
  expect(badges.length).toBeGreaterThanOrEqual(2);
});

test("フッターフォームから意見を追加でき、localStorage に保存される", async () => {
  await mountBoard();

  fireEvent.change(screen.getByLabelText("意見を入力"), { target: { value: "テスト意見123" } });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByText("テスト意見123")).toBeInTheDocument();
  await waitFor(() => {
    expect(localStorage.getItem(STORAGE_KEY)).toContain("テスト意見123");
  });
});

test("フッターフォームで対立相手と根拠を指定して追加でき、既存の対立は壊れない", async () => {
  await mountBoard();

  const badgesBefore = screen.getAllByText("⚡").length;

  fireEvent.change(screen.getByLabelText("意見を入力"), { target: { value: "対立付き意見" } });
  fireEvent.change(screen.getByLabelText("根拠を入力（任意）"), { target: { value: "その根拠X" } });
  // 対立相手セレクト（footer）で先頭の相手（＝既にペアを持つアンカー s1）を選ぶ
  const opposesSelect = screen.getByLabelText("対立する意見を選択") as HTMLSelectElement;
  const firstOpposeId = within(opposesSelect)
    .getAllByRole("option")
    .map((o) => (o as HTMLOptionElement).value)
    .find((v) => v !== "");
  expect(firstOpposeId).toBeTruthy();
  fireEvent.change(opposesSelect, { target: { value: firstOpposeId } });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByText("対立付き意見")).toBeInTheDocument();
  expect(await screen.findByText("・その根拠X")).toBeInTheDocument();
  // 【回帰】s1 の元の対立相手 s2 は single に落ちず存続し、⚡ バッジが1つ増える
  expect(screen.getByText("チーム単位で島を作った方が連携が取りやすい")).toBeInTheDocument();
  expect(screen.getAllByText("⚡").length).toBe(badgesBefore + 1);
});

test("フッターの論点を切り替えて別の論点に意見を追加できる", async () => {
  await mountBoard();

  const topicSelect = screen.getByLabelText("論点を選択") as HTMLSelectElement;
  const costOption = within(topicSelect)
    .getAllByRole("option")
    .find((o) => o.textContent === "コスト") as HTMLOptionElement;
  fireEvent.change(topicSelect, { target: { value: costOption.value } });

  fireEvent.change(screen.getByLabelText("意見を入力"), {
    target: { value: "コスト論点への意見" },
  });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByText("コスト論点への意見")).toBeInTheDocument();
});

test("「+ 意見を追加」インラインで意見を追加できる", async () => {
  await mountBoard();
  fireEvent.click(screen.getAllByRole("button", { name: "+ 意見を追加" })[0]);
  // インラインフォームの入力欄はフッターと同ラベルのため、DOM 先頭（＝インライン）を使う
  fireEvent.change(screen.getAllByLabelText("意見を入力")[0], {
    target: { value: "インライン意見" },
  });
  // 開いているインラインフォームの「追加」（フッターより DOM 前方）
  fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);
  expect(await screen.findByText("インライン意見")).toBeInTheDocument();
});

test("「+ 意見を追加」インラインで対立を指定して追加できる", async () => {
  await mountBoard();
  const badgesBefore = screen.getAllByText("⚡").length;

  fireEvent.click(screen.getAllByRole("button", { name: "+ 意見を追加" })[0]);
  fireEvent.change(screen.getAllByLabelText("意見を入力")[0], {
    target: { value: "インライン対立付き意見" },
  });
  // インラインの対立相手セレクト（DOM 先頭）で先頭の候補を選ぶ
  const inlineOpposes = screen.getAllByLabelText("対立する意見を選択")[0] as HTMLSelectElement;
  const firstOpposeId = within(inlineOpposes)
    .getAllByRole("option")
    .map((o) => (o as HTMLOptionElement).value)
    .find((v) => v !== "");
  expect(firstOpposeId).toBeTruthy();
  fireEvent.change(inlineOpposes, { target: { value: firstOpposeId } });
  fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);

  expect(await screen.findByText("インライン対立付き意見")).toBeInTheDocument();
  // 対立指定により ⚡ バッジが1つ増える
  expect(screen.getAllByText("⚡").length).toBe(badgesBefore + 1);
});

test("「+ 子論点を追加」で子論点を追加できる", async () => {
  await mountBoard();
  fireEvent.click(screen.getAllByRole("button", { name: "+ 子論点を追加" })[0]);
  fireEvent.change(screen.getByLabelText("子論点の名前を入力"), {
    target: { value: "新規子論点Z" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);
  expect((await screen.findAllByText("└ 新規子論点Z")).length).toBeGreaterThan(0);
});

test("単体意見に「⚡ 対立意見を追加」でインライン対立を追加できる", async () => {
  await mountBoard();
  fireEvent.click(screen.getAllByRole("button", { name: "⚡ 対立意見を追加" })[0]);
  fireEvent.change(screen.getByLabelText("対立する意見を入力"), {
    target: { value: "新規対立意見W" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);
  expect(await screen.findByText("新規対立意見W")).toBeInTheDocument();
});

test("意見に根拠を追加・編集・削除できる", async () => {
  await mountBoard();

  const opinion = screen.getByText("研修期間を考えると年度末が現実的");
  const card = opinion.parentElement as HTMLElement;

  // 追加
  fireEvent.click(within(card).getByRole("button", { name: "+ 根拠を追加" }));
  fireEvent.change(screen.getByLabelText("根拠を入力"), { target: { value: "根拠テスト" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  const rationale = await within(card).findByText("・根拠テスト");

  // 編集（根拠テキストをクリック→編集）
  fireEvent.click(rationale);
  fireEvent.change(screen.getByLabelText("根拠を編集"), { target: { value: "根拠編集済" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(await within(card).findByText("・根拠編集済")).toBeInTheDocument();

  // 削除
  fireEvent.click(within(card).getByRole("button", { name: "根拠を削除" }));
  await waitFor(() => {
    expect(within(card).queryByText("・根拠編集済")).not.toBeInTheDocument();
  });
});
