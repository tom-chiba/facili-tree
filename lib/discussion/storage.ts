// 議論データのブラウザ永続化（localStorage）。バックエンドは持たない。

import type { Topic } from "./types";

const STORAGE_KEY = "facili-tree:discussion:v1";

/**
 * 永続化された議論データを読み込む。
 * SSR 環境やデータ不在・破損時は null を返す（呼び出し側でシードにフォールバックする）。
 */
export function loadTopics(): Topic[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Topic[];
  } catch {
    return null;
  }
}

/** 議論データを永続化する。localStorage が使えない環境では何もしない。 */
export function saveTopics(topics: Topic[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  } catch {
    // 容量超過やプライベートモード等の失敗は無視する（UI 操作を妨げない）。
  }
}
