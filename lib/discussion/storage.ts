// 議論データのブラウザ永続化（localStorage）。バックエンドは持たない。

import type { Discussion } from "./types";

const STORAGE_KEY = "facili-tree:discussion:v3";

/**
 * 永続化された議論データの生の値（パース結果）を返す。
 * 形状は保証しない（呼び出し側で normalizeDiscussion により検証・整形する）。
 * SSR 環境・データ不在・パース失敗時は null を返す。
 */
export function loadDiscussion(): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 議論データを永続化する。localStorage が使えない環境では何もしない。 */
export function saveDiscussion(discussion: Discussion): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(discussion));
  } catch {
    // 容量超過やプライベートモード等の失敗は無視する（UI 操作を妨げない）。
  }
}
