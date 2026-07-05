import { describe, expect, test } from "vitest";
import {
  addConflictStatement,
  addRationale,
  addStatement,
  addSubtopic,
  deleteRationale,
  editRationale,
  findContainer,
  flattenAxisView,
  flattenTopicOptions,
  computeGroupModel,
  optsFor,
  seedTopics,
  splitGroupsMulti,
} from "@/lib/discussion/model";
import type { Statement, Topic } from "@/lib/discussion/types";

function stmt(id: string, text: string, over: Partial<Statement> = {}): Statement {
  return { id, text, opposes: null, opposesIds: [], rationales: [], ...over };
}

function topic(
  id: string,
  name: string,
  statements: Statement[] = [],
  subtopics: Topic[] = [],
): Topic {
  return { id, name, statements, subtopics };
}

describe("splitGroupsMulti", () => {
  test("対立なしの意見は single になる", () => {
    const g = splitGroupsMulti([stmt("a", "A"), stmt("b", "B")]);
    expect(g.pairRows).toHaveLength(0);
    expect(g.singles.map((s) => s.id)).toEqual(["a", "b"]);
    expect(g.hasSingles).toBe(true);
  });

  test("1対1の対立はペアになる（重複しない）", () => {
    const g = splitGroupsMulti([
      stmt("a", "A", { opposes: "b" }),
      stmt("b", "B", { opposes: "a" }),
    ]);
    expect(g.pairRows).toHaveLength(1);
    expect(g.pairRows[0].a.id).toBe("a");
    expect(g.pairRows[0].others.map((s) => s.id)).toEqual(["b"]);
    expect(g.singles).toHaveLength(0);
  });

  test("多対立（opposesIds）はアンカー1件に複数 others が付く", () => {
    const g = splitGroupsMulti([
      stmt("a", "A", { opposesIds: ["b", "c"] }),
      stmt("b", "B", { opposes: "a" }),
      stmt("c", "C", { opposes: "a" }),
    ]);
    expect(g.pairRows).toHaveLength(1);
    expect(g.pairRows[0].a.id).toBe("a");
    expect(g.pairRows[0].others.map((s) => s.id)).toEqual(["b", "c"]);
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

  test("opposes 指定時は相手意見と双方向に対立を張る", () => {
    const before = [topic("t1", "論点1", [stmt("s1", "既存")])];
    const after = addStatement(before, "t1", "反対意見", "s1");
    const c = findContainer(after, "t1")!;
    const existing = c.statements.find((s) => s.id === "s1")!;
    const added = c.statements.find((s) => s.text === "反対意見")!;
    expect(existing.opposes).toBe(added.id);
    expect(added.opposes).toBe("s1");
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
  test("単体意見に対立意見を追加し双方向に結ぶ", () => {
    const before = [topic("t1", "論点1", [stmt("s1", "元意見")])];
    const after = addConflictStatement(before, "s1", "対立意見");
    const c = findContainer(after, "t1")!;
    const added = c.statements.find((s) => s.text === "対立意見")!;
    expect(c.statements.find((s) => s.id === "s1")!.opposes).toBe(added.id);
    expect(added.opposes).toBe("s1");
  });
});

describe("addSubtopic", () => {
  test("子論点を追加する", () => {
    const before = [topic("t1", "親")];
    const after = addSubtopic(before, "t1", "新しい子論点");
    expect(findContainer(after, "t1")!.subtopics).toHaveLength(1);
    expect(findContainer(after, "t1")!.subtopics[0].name).toBe("新しい子論点");
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

  test("追加", () => {
    const after = addRationale(base, "s1", "根拠2");
    const s = findContainer(after, "t1")!.statements[0];
    expect(s.rationales.map((r) => r.text)).toEqual(["根拠1", "根拠2"]);
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

  test("optsFor は論点内の意見を短縮テキストで返す", () => {
    const long = "あ".repeat(30);
    const topics = [topic("t1", "論点1", [stmt("s1", long)])];
    const opts = optsFor(topics, "t1");
    expect(opts).toHaveLength(1);
    expect(opts[0].text.endsWith("…")).toBe(true);
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

describe("seedTopics", () => {
  test("3つの論点と入れ子・対立ペアを含む", () => {
    const topics = seedTopics();
    expect(topics).toHaveLength(3);
    expect(topics[0].subtopics).toHaveLength(1);
    const grouped = computeGroupModel(topics);
    // 座席のルールには対立ペアがある
    expect(grouped[0].pairRows.length).toBeGreaterThan(0);
  });
});
