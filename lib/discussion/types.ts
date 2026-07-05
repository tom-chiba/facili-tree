// 議論マップ（2c 対立ボード）のドメイン型。
// UI から独立した純粋なデータ構造として定義し、model.ts の純粋関数で操作する。

/** 意見（Statement）に付く根拠。 */
export type Rationale = {
  id: string;
  text: string;
};

/**
 * 意見（Statement）。
 * - opposes: 1対1の対立相手の Statement id（UI から追加した対立は双方向にこれを張る）
 * - opposesIds: 1件が複数意見と対立する場合のアンカー側が持つ相手 id 群（主にシードデータ由来）
 */
export type Statement = {
  id: string;
  text: string;
  opposes: string | null;
  opposesIds: string[];
  rationales: Rationale[];
};

/** 論点（Topic）。subtopics により入れ子（子論点）を表現する。 */
export type Topic = {
  id: string;
  name: string;
  statements: Statement[];
  subtopics: Topic[];
};
