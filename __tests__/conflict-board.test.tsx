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

test("破損した localStorage ではクラッシュせずシードにフォールバックする", async () => {
  localStorage.setItem(STORAGE_KEY, "{not valid json");
  await mountBoard();
  // シードの既知意見が表示される（＝シード経路にフォールバック）
  expect(screen.getByText("座席数を減らして賃料を下げるべき")).toBeInTheDocument();
});

test("空配列の localStorage でもシードにフォールバックする", async () => {
  localStorage.setItem(STORAGE_KEY, "[]");
  await mountBoard();
  expect(screen.getByText("座席数を減らして賃料を下げるべき")).toBeInTheDocument();
});

test("永続データの片方向対立を読込時に対称化して対立ペアとして描画する", async () => {
  // b が先・a のみ opposesIds=[b] という片方向かつ配列順が不利なデータ
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        id: "t1",
        name: "論点",
        subtopics: [],
        statements: [
          { id: "b", text: "意見B片方向", opposesIds: [], rationales: [] },
          { id: "a", text: "意見A片方向", opposesIds: ["b"], rationales: [] },
        ],
      },
    ]),
  );
  await mountBoard();
  expect(screen.getByText("意見A片方向")).toBeInTheDocument();
  expect(screen.getByText("意見B片方向")).toBeInTheDocument();
  // 対称化されないと b が single に落ち ⚡=0 になる。対称化により対立ペア（⚡=1）で描画される
  expect(screen.getAllByText("⚡")).toHaveLength(1);
});

test("保存済みの非シードデータはシードではなく復元される", async () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      {
        id: "t1",
        name: "保存済み論点",
        statements: [{ id: "s1", text: "保存済み意見", opposesIds: [], rationales: [] }],
        subtopics: [],
      },
    ]),
  );
  await mountBoard();
  expect(screen.getByText("保存済み意見")).toBeInTheDocument();
  // シードの意見は出ない
  expect(screen.queryByText("座席数を減らして賃料を下げるべき")).not.toBeInTheDocument();
});

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

test("多対立が1つのクラスタ内に複数の ⚡ 相手として描画される", async () => {
  await mountBoard();
  // コスト論点のアンカー（s4）を含む対立ペア行にスコープし、相手3件分の ⚡ が並ぶことを厳密に確認する。
  // 構造: pairRow > [左列(アンカーのテキスト), 右列(相手 ⚡ 群)]。アンカーのテキスト要素の
  // 親（左列）→ さらに親が pairRow。
  const anchorText = screen.getByText("座席数を減らして賃料を下げるべき");
  const pairRow = anchorText.parentElement?.parentElement as HTMLElement;
  // s4 は s5b/s5c/s5 の3件と対立（シード）。行内の ⚡ はちょうど3件
  expect(within(pairRow).getAllByText("⚡")).toHaveLength(3);
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

test("フッターの論点切替で対立候補が入れ替わり、選択済みの対立はリセットされる", async () => {
  await mountBoard();
  const opposesSelect = () => screen.getByLabelText("対立する意見を選択") as HTMLSelectElement;

  // 座席のルールの候補にはフリーアドレスがある。対立相手を1つ選ぶ
  expect(
    within(opposesSelect()).getByRole("option", { name: /フリーアドレス/ }),
  ).toBeInTheDocument();
  const firstOppose = within(opposesSelect())
    .getAllByRole("option")
    .map((o) => (o as HTMLOptionElement).value)
    .find((v) => v !== "") as string;
  fireEvent.change(opposesSelect(), { target: { value: firstOppose } });
  expect(opposesSelect().value).toBe(firstOppose);

  // 論点をコストに切り替える
  const topicSelect = screen.getByLabelText("論点を選択") as HTMLSelectElement;
  const cost = within(topicSelect)
    .getAllByRole("option")
    .find((o) => o.textContent === "コスト") as HTMLOptionElement;
  fireEvent.change(topicSelect, { target: { value: cost.value } });

  // 対立候補はコストの意見へ入れ替わり、前の選択はリセットされる
  expect(opposesSelect().value).toBe("");
  expect(
    within(opposesSelect()).queryByRole("option", { name: /フリーアドレス/ }),
  ).not.toBeInTheDocument();
  expect(
    within(opposesSelect()).getByRole("option", { name: /座席数を減らして賃料を下げる/ }),
  ).toBeInTheDocument();
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

test("単体意見に「⚡ 対立意見を追加」でインライン対立を追加でき、対立ペアが形成される", async () => {
  await mountBoard();
  const badgesBefore = screen.getAllByText("⚡").length;

  fireEvent.click(screen.getAllByRole("button", { name: "⚡ 対立意見を追加" })[0]);
  fireEvent.change(screen.getByLabelText("対立する意見を入力"), {
    target: { value: "新規対立意見W" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);

  expect(await screen.findByText("新規対立意見W")).toBeInTheDocument();
  // single が対立ペアに変わり ⚡ バッジが1つ増える
  expect(screen.getAllByText("⚡").length).toBe(badgesBefore + 1);
});

test("インライン意見追加を取消するとフォームが閉じ、追加されない", async () => {
  await mountBoard();
  fireEvent.click(screen.getAllByRole("button", { name: "+ 意見を追加" })[0]);
  // インラインフォームが開き「意見を入力」が2つ（インライン＋フッター）になる
  expect(screen.getAllByLabelText("意見を入力").length).toBe(2);
  fireEvent.change(screen.getAllByLabelText("意見を入力")[0], {
    target: { value: "取消される意見" },
  });
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  // フォームが閉じ、フッターの1つに戻る／内容も追加されない
  expect(screen.getAllByLabelText("意見を入力").length).toBe(1);
  expect(screen.queryByText("取消される意見")).not.toBeInTheDocument();
});

test("根拠追加を取消すると追加されない", async () => {
  await mountBoard();
  const opinion = screen.getByText("研修期間を考えると年度末が現実的");
  const card = opinion.parentElement as HTMLElement;

  fireEvent.click(within(card).getByRole("button", { name: "+ 根拠を追加" }));
  fireEvent.change(screen.getByLabelText("根拠を入力"), { target: { value: "取消される根拠" } });
  fireEvent.click(screen.getByRole("button", { name: "取消" }));

  expect(screen.queryByText("・取消される根拠")).not.toBeInTheDocument();
  // フォームが閉じ「+ 根拠を追加」に戻る
  expect(within(card).getByRole("button", { name: "+ 根拠を追加" })).toBeInTheDocument();
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
