import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ConflictBoard } from "@/app/_components/ConflictBoard";

const STORAGE_KEY = "facili-tree:discussion:v3";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// 論点・意見を用意した議論。意見/対立/根拠まわりのテストはこれを事前投入して開始する。
const SAMPLE = {
  title: "議論",
  participants: [],
  topics: [
    {
      id: "t1",
      name: "論点A",
      statements: [
        { id: "s1", text: "意見1", opposesIds: ["s2"], rationales: [] },
        { id: "s2", text: "意見2", opposesIds: ["s1"], rationales: [] },
        { id: "s3", text: "単体意見", opposesIds: [], rationales: [] },
      ],
      subtopics: [],
    },
    {
      id: "t2",
      name: "論点B",
      statements: [{ id: "s4", text: "コスト意見", opposesIds: [], rationales: [] }],
      subtopics: [],
    },
  ],
};

/** 空の初期状態でマウントする（永続データ無し）。 */
async function mountEmpty() {
  render(<ConflictBoard />);
  await screen.findByRole("heading", { name: "無題の議論" });
}

/** 事前投入した議論でマウントする。 */
async function mountWithSample() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE));
  render(<ConflictBoard />);
  await screen.findByRole("heading", { name: "議論" });
}

test("初期状態は空ボードで、案内文が出て意見入力フッターは表示されない", async () => {
  await mountEmpty();
  expect(screen.getByText(/まだ論点がありません/)).toBeInTheDocument();
  // 論点が無い間は意見追加フッター（論点選択・意見入力）を出さない
  expect(screen.queryByLabelText("論点を選択")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("意見を入力")).not.toBeInTheDocument();
});

test("破損した localStorage ではクラッシュせず空の議論にフォールバックする", async () => {
  localStorage.setItem(STORAGE_KEY, "{not valid json");
  await mountEmpty();
  expect(screen.getByText(/まだ論点がありません/)).toBeInTheDocument();
});

test("保存済みの議論データが復元される", async () => {
  await mountWithSample();
  expect(screen.getByText("意見1")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "論点B" })).toBeInTheDocument();
});

test("「＋ 論点を追加」でトップレベル論点を追加でき、追加後に意見フッターが出る", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "＋ 論点を追加" }));
  fireEvent.change(screen.getByLabelText("論点の名前を入力"), {
    target: { value: "最初の論点" },
  });
  // この時点でフッターは未表示のため「追加」は論点フォームのものが一意
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  // 追加後、意見入力フッターが現れ、論点が選択肢になる
  expect(await screen.findByLabelText("意見を入力")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "最初の論点" })).toBeInTheDocument();
});

test("タイトルを編集でき、見出しに反映され localStorage に保存される", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  const input = screen.getByLabelText("議論タイトルを編集");
  fireEvent.change(input, { target: { value: "新オフィス検討" } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(await screen.findByRole("heading", { name: "新オフィス検討" })).toBeInTheDocument();
  await waitFor(() => {
    expect(localStorage.getItem(STORAGE_KEY)).toContain("新オフィス検討");
  });
});

test("タイトル編集を Escape で取り消すと見出しが元に戻り保存されない", async () => {
  // 事前に "議論" が設定された状態から編集→Escape する
  await mountWithSample();
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  const input = screen.getByLabelText("議論タイトルを編集");
  fireEvent.change(input, { target: { value: "破棄されるタイトル" } });
  // Escape で取消。input のアンマウントで onBlur が走っても確定させないこと
  fireEvent.keyDown(input, { key: "Escape" });
  fireEvent.blur(input);

  expect(await screen.findByRole("heading", { name: "議論" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "破棄されるタイトル" })).not.toBeInTheDocument();
  await waitFor(() => {
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain("破棄されるタイトル");
  });
});

test("設定済みタイトルを空にして確定すると見出しが『無題の議論』に戻る", async () => {
  await mountWithSample();
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  const input = screen.getByLabelText("議論タイトルを編集");
  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(await screen.findByRole("heading", { name: "無題の議論" })).toBeInTheDocument();
});

test("既存タイトルの編集を開くと現在値が前詰めされ、無変更で確定しても保持される", async () => {
  await mountWithSample(); // title="議論"
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  const input = screen.getByLabelText("議論タイトルを編集") as HTMLInputElement;
  // 現在のタイトルが前詰めされている（startEditTitle が空へ退行していないこと）
  expect(input.value).toBe("議論");
  // 何も変更せず blur → タイトルは失われない
  fireEvent.blur(input);

  expect(await screen.findByRole("heading", { name: "議論" })).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).title).toBe("議論");
  });
});

test("タイトル編集はフォーカスアウト（blur）でも確定される", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  const input = screen.getByLabelText("議論タイトルを編集");
  fireEvent.change(input, { target: { value: "blur確定タイトル" } });
  fireEvent.blur(input);

  expect(await screen.findByRole("heading", { name: "blur確定タイトル" })).toBeInTheDocument();
});

test("Escape 取消の直後に再編集して確定できる（取消ガードが残存しない）", async () => {
  await mountWithSample();
  // 1回目: 編集して Escape で取消
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  fireEvent.change(screen.getByLabelText("議論タイトルを編集"), { target: { value: "一時的" } });
  fireEvent.keyDown(screen.getByLabelText("議論タイトルを編集"), { key: "Escape" });
  expect(await screen.findByRole("heading", { name: "議論" })).toBeInTheDocument();

  // 2回目: 再編集して Enter で確定 → ガードが残っていると確定が黙って捨てられる
  fireEvent.click(screen.getByRole("button", { name: "タイトルを編集" }));
  fireEvent.change(screen.getByLabelText("議論タイトルを編集"), { target: { value: "再編集後" } });
  fireEvent.keyDown(screen.getByLabelText("議論タイトルを編集"), { key: "Enter" });
  expect(await screen.findByRole("heading", { name: "再編集後" })).toBeInTheDocument();
});

test("参加者を追加・削除できる", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "参加者を追加" }));
  fireEvent.change(screen.getByLabelText("参加者名を入力"), { target: { value: "田中" } });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByLabelText("参加者 田中")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "参加者 田中 を削除" }));
  await waitFor(() => {
    expect(screen.queryByLabelText("参加者 田中")).not.toBeInTheDocument();
  });
});

test("参加者追加を取消すると参加者は増えない", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "参加者を追加" }));
  fireEvent.change(screen.getByLabelText("参加者名を入力"), { target: { value: "山田" } });
  fireEvent.click(screen.getByRole("button", { name: "取消" }));

  expect(screen.queryByLabelText("参加者 山田")).not.toBeInTheDocument();
  // フォームが閉じ「参加者を追加」ボタンに戻る
  expect(screen.getByRole("button", { name: "参加者を追加" })).toBeInTheDocument();
});

test("参加者は Enter キーで追加できる", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "参加者を追加" }));
  const input = screen.getByLabelText("参加者名を入力");
  fireEvent.change(input, { target: { value: "鈴木" } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(await screen.findByLabelText("参加者 鈴木")).toBeInTheDocument();
});

test("論点は Enter キーで追加でき、意見フッターが出る", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "＋ 論点を追加" }));
  const input = screen.getByLabelText("論点の名前を入力");
  fireEvent.change(input, { target: { value: "運用ルール" } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(await screen.findByLabelText("意見を入力")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "運用ルール" })).toBeInTheDocument();
});

test("論点追加を取消すると論点は増えず、空状態のままフッターも出ない", async () => {
  await mountEmpty();
  fireEvent.click(screen.getByRole("button", { name: "＋ 論点を追加" }));
  fireEvent.change(screen.getByLabelText("論点の名前を入力"), {
    target: { value: "破棄される論点" },
  });
  fireEvent.click(screen.getByRole("button", { name: "取消" }));

  expect(screen.queryByText("破棄される論点")).not.toBeInTheDocument();
  expect(screen.getByText(/まだ論点がありません/)).toBeInTheDocument();
  // 論点が無いままなので意見追加フッターは出ない
  expect(screen.queryByLabelText("意見を入力")).not.toBeInTheDocument();
});

test("フッターフォームから意見を追加でき、localStorage に保存される", async () => {
  await mountWithSample();

  fireEvent.change(screen.getByLabelText("意見を入力"), { target: { value: "テスト意見123" } });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByText("テスト意見123")).toBeInTheDocument();
  await waitFor(() => {
    expect(localStorage.getItem(STORAGE_KEY)).toContain("テスト意見123");
  });
});

test("フッターフォームで対立相手と根拠を指定して追加でき、既存の対立は壊れない", async () => {
  await mountWithSample();

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
  expect(screen.getByText("意見2")).toBeInTheDocument();
  expect(screen.getAllByText("⚡").length).toBe(badgesBefore + 1);
});

test("フッターの論点切替で対立候補が入れ替わり、選択済みの対立はリセットされる", async () => {
  await mountWithSample();
  const opposesSelect = () => screen.getByLabelText("対立する意見を選択") as HTMLSelectElement;

  // 論点A の候補には意見1がある。対立相手を1つ選ぶ
  expect(within(opposesSelect()).getByRole("option", { name: /意見1/ })).toBeInTheDocument();
  const firstOppose = within(opposesSelect())
    .getAllByRole("option")
    .map((o) => (o as HTMLOptionElement).value)
    .find((v) => v !== "") as string;
  fireEvent.change(opposesSelect(), { target: { value: firstOppose } });
  expect(opposesSelect().value).toBe(firstOppose);

  // 論点を論点B に切り替える
  const topicSelect = screen.getByLabelText("論点を選択") as HTMLSelectElement;
  const topicB = within(topicSelect)
    .getAllByRole("option")
    .find((o) => o.textContent === "論点B") as HTMLOptionElement;
  fireEvent.change(topicSelect, { target: { value: topicB.value } });

  // 対立候補は論点B の意見へ入れ替わり、前の選択はリセットされる
  expect(opposesSelect().value).toBe("");
  expect(within(opposesSelect()).queryByRole("option", { name: /意見1/ })).not.toBeInTheDocument();
  expect(within(opposesSelect()).getByRole("option", { name: /コスト意見/ })).toBeInTheDocument();
});

test("フッターの論点を切り替えて別の論点に意見を追加できる", async () => {
  await mountWithSample();

  const topicSelect = screen.getByLabelText("論点を選択") as HTMLSelectElement;
  const topicB = within(topicSelect)
    .getAllByRole("option")
    .find((o) => o.textContent === "論点B") as HTMLOptionElement;
  fireEvent.change(topicSelect, { target: { value: topicB.value } });

  fireEvent.change(screen.getByLabelText("意見を入力"), {
    target: { value: "論点Bへの意見" },
  });
  fireEvent.click(screen.getByRole("button", { name: "追加" }));

  expect(await screen.findByText("論点Bへの意見")).toBeInTheDocument();
});

test("「+ 意見を追加」インラインで意見を追加できる", async () => {
  await mountWithSample();
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
  await mountWithSample();
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
  await mountWithSample();
  fireEvent.click(screen.getAllByRole("button", { name: "+ 子論点を追加" })[0]);
  fireEvent.change(screen.getByLabelText("子論点の名前を入力"), {
    target: { value: "新規子論点Z" },
  });
  fireEvent.click(screen.getAllByRole("button", { name: "追加" })[0]);
  expect((await screen.findAllByText("└ 新規子論点Z")).length).toBeGreaterThan(0);
});

test("単体意見に「⚡ 対立意見を追加」でインライン対立を追加でき、対立ペアが形成される", async () => {
  await mountWithSample();
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
  await mountWithSample();
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
  await mountWithSample();
  const opinion = screen.getByText("単体意見");
  const card = opinion.parentElement as HTMLElement;

  fireEvent.click(within(card).getByRole("button", { name: "+ 根拠を追加" }));
  fireEvent.change(screen.getByLabelText("根拠を入力"), { target: { value: "取消される根拠" } });
  fireEvent.click(screen.getByRole("button", { name: "取消" }));

  expect(screen.queryByText("・取消される根拠")).not.toBeInTheDocument();
  // フォームが閉じ「+ 根拠を追加」に戻る
  expect(within(card).getByRole("button", { name: "+ 根拠を追加" })).toBeInTheDocument();
});

test("意見に根拠を追加・編集・削除できる", async () => {
  await mountWithSample();

  const opinion = screen.getByText("単体意見");
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
