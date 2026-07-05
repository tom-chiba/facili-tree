import { describe, expect, test } from "vitest";
import {
  addConflictStatement,
  addRationale,
  addStatement,
  addSubtopic,
  computeGroupModel,
  deleteRationale,
  editRationale,
  findContainer,
  flattenAxisView,
  flattenTopicOptions,
  normalizeTopics,
  opposesOptionsOf,
  seedTopics,
  splitGroupsMulti,
} from "@/lib/discussion/model";
import type { Statement, Topic } from "@/lib/discussion/types";

function stmt(id: string, text: string, over: Partial<Statement> = {}): Statement {
  return { id, text, opposesIds: [], rationales: [], ...over };
}

function topic(
  id: string,
  name: string,
  statements: Statement[] = [],
  subtopics: Topic[] = [],
): Topic {
  return { id, name, statements, subtopics };
}

/** 対称な対立関係を張った意見ペアを生成する。 */
function linkedPair(): [Statement, Statement] {
  const a = stmt("a", "A", { opposesIds: ["b"] });
  const b = stmt("b", "B", { opposesIds: ["a"] });
  return [a, b];
}

describe("splitGroupsMulti", () => {
  test("対立なしの意見は single になる", () => {
    const g = splitGroupsMulti([stmt("a", "A"), stmt("b", "B")]);
    expect(g.pairRows).toHaveLength(0);
    expect(g.singles.map((s) => s.id)).toEqual(["a", "b"]);
    expect(g.hasSingles).toBe(true);
  });

  test("対称な1対1の対立はペアになる（重複しない）", () => {
    const g = splitGroupsMulti(linkedPair());
    expect(g.pairRows).toHaveLength(1);
    expect(g.pairRows[0].a.id).toBe("a");
    expect(g.pairRows[0].others.map((s) => s.id)).toEqual(["b"]);
    expect(g.singles).toHaveLength(0);
  });

  test("多対立はクラスタ内で最多対立の意見がアンカーになる", () => {
    const g = splitGroupsMulti([
      stmt("a", "A", { opposesIds: ["b", "c"] }),
      stmt("b", "B", { opposesIds: ["a"] }),
      stmt("c", "C", { opposesIds: ["a"] }),
    ]);
    expect(g.pairRows).toHaveLength(1);
    expect(g.pairRows[0].a.id).toBe("a");
    expect(g.pairRows[0].others.map((s) => s.id)).toEqual(["b", "c"]);
  });

  test("グルーピングは配列順に依存しない（アンカーが後方でも同じクラスタ）", () => {
    // アンカー a を配列の最後に置く
    const g = splitGroupsMulti([
      stmt("b", "B", { opposesIds: ["a"] }),
      stmt("c", "C", { opposesIds: ["a"] }),
      stmt("a", "A", { opposesIds: ["b", "c"] }),
    ]);
    expect(g.pairRows).toHaveLength(1);
    expect(g.pairRows[0].a.id).toBe("a");
    expect(g.pairRows[0].others.map((s) => s.id).sort()).toEqual(["b", "c"]);
    expect(g.singles).toHaveLength(0);
  });

  test("非対称な opposesIds でも意見を二重に取り込まない", () => {
    // A→B の片方向のみ（B は A を参照しない）。BFS の visited ガードで二重取り込みを防ぐ
    const g = splitGroupsMulti([stmt("b", "B"), stmt("a", "A", { opposesIds: ["b"] })]);
    const seen = [
      ...g.pairRows.flatMap((r) => [r.a.id, ...r.others.map((o) => o.id)]),
      ...g.singles.map((s) => s.id),
    ];
    // b は1回だけ現れる
    expect(seen.filter((id) => id === "b")).toHaveLength(1);
  });
});

describe("addStatement", () => {
  test("指定論点に意見を追加する", () => {
    const before = [topic("t1", "論点1")];
    const after = addStatement(before, "t1", "新しい意見", null);
    expect(findContainer(after, "t1")!.statements).toHaveLength(1);
    expect(findContainer(after, "t1")!.statements[0].text).toBe("新しい意見");
    // イミュータブル: 元は変わらない
    expect(findContainer(before, "t1")!.statements).toHaveLength(0);
  });

  test("空文字は追加しない", () => {
    const before = [topic("t1", "論点1")];
    expect(addStatement(before, "t1", "   ", null)).toBe(before);
  });

  test("opposes 指定時は相手意見と対称に対立を張る", () => {
    const before = [topic("t1", "論点1", [stmt("s1", "既存")])];
    const after = addStatement(before, "t1", "反対意見", "s1");
    const c = findContainer(after, "t1")!;
    const existing = c.statements.find((s) => s.id === "s1")!;
    const added = c.statements.find((s) => s.text === "反対意見")!;
    expect(existing.opposesIds).toContain(added.id);
    expect(added.opposesIds).toContain("s1");
  });

  test("【回帰】既にペアの意見に2つ目の対立を足しても最初の対立は壊れない", () => {
    // s1 ↔ s2 が既にペア
    const before = [
      topic("t1", "論点1", [
        stmt("s1", "S1", { opposesIds: ["s2"] }),
        stmt("s2", "S2", { opposesIds: ["s1"] }),
      ]),
    ];
    // s1 に対する2つ目の対立意見 X を追加
    const after = addStatement(before, "t1", "X", "s1");
    const c = findContainer(after, "t1")!;
    const s1 = c.statements.find((s) => s.id === "s1")!;
    const s2 = c.statements.find((s) => s.id === "s2")!;
    const x = c.statements.find((s) => s.text === "X")!;
    // s1 は s2 と X の両方に対立、s2 の対立(s1)は保持される
    expect(s1.opposesIds).toEqual(expect.arrayContaining(["s2", x.id]));
    expect(s2.opposesIds).toContain("s1");
    // 表示上も s2 が single に落ちず、1つのクラスタ（アンカー s1・相手2件）になる
    const g = splitGroupsMulti(c.statements);
    expect(g.pairRows).toHaveLength(1);
    expect(g.pairRows[0].a.id).toBe("s1");
    expect(g.pairRows[0].others.map((s) => s.id).sort()).toEqual([x.id, "s2"].sort());
    expect(g.singles).toHaveLength(0);
  });

  test("入れ子の子論点にも追加できる", () => {
    const before = [topic("t1", "親", [], [topic("t1a", "子")])];
    const after = addStatement(before, "t1a", "子の意見", null);
    expect(findContainer(after, "t1a")!.statements).toHaveLength(1);
  });

  test("根拠テキスト付きで追加できる", () => {
    const before = [topic("t1", "論点1")];
    const after = addStatement(before, "t1", "意見", null, "その根拠");
    expect(findContainer(after, "t1")!.statements[0].rationales).toHaveLength(1);
    expect(findContainer(after, "t1")!.statements[0].rationales[0].text).toBe("その根拠");
  });
});

describe("addConflictStatement", () => {
  test("単体意見に対立意見を追加し対称に結ぶ", () => {
    const before = [topic("t1", "論点1", [stmt("s1", "元意見")])];
    const after = addConflictStatement(before, "s1", "対立意見");
    const c = findContainer(after, "t1")!;
    const added = c.statements.find((s) => s.text === "対立意見")!;
    expect(c.statements.find((s) => s.id === "s1")!.opposesIds).toContain(added.id);
    expect(added.opposesIds).toContain("s1");
  });

  test("空文字は追加しない", () => {
    const before = [topic("t1", "論点1", [stmt("s1", "元意見")])];
    expect(addConflictStatement(before, "s1", "  ")).toBe(before);
  });

  test("入れ子の子論点内の意見にも対立を追加できる（イミュータブル）", () => {
    const before = [topic("t1", "親", [], [topic("t1a", "子", [stmt("s1", "元")])])];
    const after = addConflictStatement(before, "s1", "対立");
    expect(findContainer(after, "t1a")!.statements).toHaveLength(2);
    expect(findContainer(before, "t1a")!.statements).toHaveLength(1);
  });
});

describe("addSubtopic", () => {
  test("子論点を追加する", () => {
    const before = [topic("t1", "親")];
    const after = addSubtopic(before, "t1", "新しい子論点");
    expect(findContainer(after, "t1")!.subtopics).toHaveLength(1);
    expect(findContainer(after, "t1")!.subtopics[0].name).toBe("新しい子論点");
    expect(findContainer(before, "t1")!.subtopics).toHaveLength(0);
  });

  test("空名は追加しない", () => {
    const before = [topic("t1", "親")];
    expect(addSubtopic(before, "t1", "  ")).toBe(before);
  });
});

describe("rationale 操作", () => {
  const base = [
    topic("t1", "論点1", [stmt("s1", "意見", { rationales: [{ id: "r1", text: "根拠1" }] })]),
  ];

  test("追加（イミュータブル）", () => {
    const after = addRationale(base, "s1", "根拠2");
    const s = findContainer(after, "t1")!.statements[0];
    expect(s.rationales.map((r) => r.text)).toEqual(["根拠1", "根拠2"]);
    expect(findContainer(base, "t1")!.statements[0].rationales).toHaveLength(1);
  });

  test("空文字の追加は無視", () => {
    expect(addRationale(base, "s1", "  ")).toBe(base);
  });

  test("編集", () => {
    const after = editRationale(base, "s1", "r1", "編集後");
    expect(findContainer(after, "t1")!.statements[0].rationales[0].text).toBe("編集後");
  });

  test("空文字への編集は無視", () => {
    expect(editRationale(base, "s1", "r1", "  ")).toBe(base);
  });

  test("削除", () => {
    const after = deleteRationale(base, "s1", "r1");
    expect(findContainer(after, "t1")!.statements[0].rationales).toHaveLength(0);
  });
});

describe("表示用ユーティリティ", () => {
  test("flattenTopicOptions は入れ子をインデント付きで平坦化する", () => {
    const topics = [topic("t1", "親", [], [topic("t1a", "子")])];
    const opts = flattenTopicOptions(topics);
    expect(opts.map((o) => o.id)).toEqual(["t1", "t1a"]);
    expect(opts[1].name).toContain("└ 子");
  });

  test("opposesOptionsOf は意見を短縮テキストで返す", () => {
    const long = "あ".repeat(30);
    const opts = opposesOptionsOf(splitGroupsMulti([stmt("s1", long), stmt("s2", "短い")]));
    expect(opts.map((o) => o.id)).toEqual(["s1", "s2"]);
    expect(opts[0].text.endsWith("…")).toBe(true);
    expect(opts[1].text).toBe("短い");
  });

  test("opposesOptionsOf は対立先候補を single とアンカーのみに絞る（葉は除外）", () => {
    // a(アンカー) ↔ b,c（葉2件） + d(single)
    const opts = opposesOptionsOf(
      splitGroupsMulti([
        stmt("a", "A", { opposesIds: ["b", "c"] }),
        stmt("b", "B", { opposesIds: ["a"] }),
        stmt("c", "C", { opposesIds: ["a"] }),
        stmt("d", "D"),
      ]),
    );
    // 葉 b,c は候補から外れ、アンカー a と single d のみ
    expect(opts.map((o) => o.id)).toEqual(["a", "d"]);
  });

  test("flattenAxisView は深さ情報を付与する", () => {
    const grouped = computeGroupModel([topic("t1", "親", [], [topic("t1a", "子")])]);
    const flat = flattenAxisView(grouped);
    expect(flat.map((n) => n.id)).toEqual(["t1", "t1a"]);
    expect(flat[0].isSub).toBe(false);
    expect(flat[1].isSub).toBe(true);
    expect(flat[1].dispName).toContain("└");
  });
});

describe("normalizeTopics", () => {
  test("欠落した opposesIds / rationales / subtopics を補う", () => {
    const broken: unknown = [{ id: "t1", name: "論点1", statements: [{ id: "s1", text: "x" }] }];
    const normalized = normalizeTopics(broken);
    expect(normalized[0].statements[0].opposesIds).toEqual([]);
    expect(normalized[0].statements[0].rationales).toEqual([]);
    expect(normalized[0].subtopics).toEqual([]);
  });

  test("配列でない入力は空配列を返す", () => {
    expect(normalizeTopics(null)).toEqual([]);
    expect(normalizeTopics({ foo: 1 })).toEqual([]);
    expect(normalizeTopics("garbage")).toEqual([]);
  });

  test("不正な要素型でも例外を出さず既定値で整える", () => {
    const messy: unknown = [
      { id: "t1", name: "論点", statements: [{ id: "s1", text: "x", opposesIds: "notarray" }] },
    ];
    const normalized = normalizeTopics(messy);
    expect(normalized[0].statements[0].opposesIds).toEqual([]);
  });

  test("片方向の対立を対称化する", () => {
    const raw: unknown = [
      {
        id: "t1",
        name: "論点",
        statements: [
          { id: "a", text: "A", opposesIds: ["b"] },
          { id: "b", text: "B", opposesIds: [] },
        ],
      },
    ];
    const [t] = normalizeTopics(raw);
    expect(t.statements.find((s) => s.id === "b")!.opposesIds).toContain("a");
  });

  test("宙吊り参照と自己参照を除去する", () => {
    const raw: unknown = [
      {
        id: "t1",
        name: "論点",
        statements: [{ id: "a", text: "A", opposesIds: ["ghost", "a"] }],
      },
    ];
    const [t] = normalizeTopics(raw);
    expect(t.statements[0].opposesIds).toEqual([]);
  });
});

describe("seedTopics", () => {
  test("3つの論点と入れ子・対立ペア・多対立を含む", () => {
    const topics = seedTopics();
    expect(topics).toHaveLength(3);
    expect(topics[0].subtopics).toHaveLength(1);
    const grouped = computeGroupModel(topics);
    // 座席のルールには対立ペアがある
    expect(grouped[0].pairRows.length).toBeGreaterThan(0);
    // コスト論点には多対立（アンカー1件に相手2件以上）がある
    const cost = grouped[1];
    expect(cost.pairRows.some((r) => r.others.length >= 2)).toBe(true);
  });
});
