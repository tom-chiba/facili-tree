import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadTopics, saveTopics } from "@/lib/discussion/storage";
import type { Topic } from "@/lib/discussion/types";

const KEY = "facili-tree:discussion:v2";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

const sample: Topic[] = [
  {
    id: "t1",
    name: "論点1",
    statements: [{ id: "s1", text: "意見", opposesIds: [], rationales: [] }],
    subtopics: [],
  },
];

describe("loadTopics", () => {
  test("データが無ければ null", () => {
    expect(loadTopics()).toBeNull();
  });

  test("不正な JSON なら null にフォールバック", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadTopics()).toBeNull();
  });

  test("保存した内容（生値）を復元できる", () => {
    saveTopics(sample);
    expect(loadTopics()).toEqual(sample);
  });
});

describe("saveTopics", () => {
  test("ラウンドトリップで一致する", () => {
    saveTopics(sample);
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual(sample);
  });
});
