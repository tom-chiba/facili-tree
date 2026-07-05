import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadDiscussion, saveDiscussion } from "@/lib/discussion/storage";
import type { Discussion } from "@/lib/discussion/types";

const KEY = "facili-tree:discussion:v3";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const sample: Discussion = {
  title: "サンプル議論",
  participants: [{ id: "p1", name: "田中" }],
  topics: [
    {
      id: "t1",
      name: "論点1",
      statements: [{ id: "s1", text: "意見", opposesIds: [], rationales: [] }],
      subtopics: [],
    },
  ],
};

describe("loadDiscussion", () => {
  test("データが無ければ null", () => {
    expect(loadDiscussion()).toBeNull();
  });

  test("不正な JSON なら null にフォールバック", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadDiscussion()).toBeNull();
  });

  test("保存した内容（生値）を復元できる", () => {
    saveDiscussion(sample);
    expect(loadDiscussion()).toEqual(sample);
  });
});

describe("saveDiscussion", () => {
  test("ラウンドトリップで一致する", () => {
    saveDiscussion(sample);
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual(sample);
  });
});
