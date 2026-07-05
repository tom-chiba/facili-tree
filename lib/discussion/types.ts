// 議論マップ（2c 対立ボード）のドメイン型。
// UI から独立した純粋なデータ構造として定義し、model.ts の純粋関数で操作する。

/** 意見（Statement）に付く根拠。 */
export type Rationale = {
  id: string;
  text: string;
};

/**
 * 意見（Statement）。
 * - opposesIds: 対立する相手 Statement の id 群。対称に張る（A が B と対立するなら
 *   A.opposesIds に B、B.opposesIds に A の双方が入る）。1件が複数と対立する多対立も表現できる。
 */
export type Statement = {
  id: string;
  text: string;
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

/** 議論の参加者。ヘッダーのアバター列に表示する。意見への紐付けは持たない。 */
export type Participant = {
  id: string;
  name: string;
};

/**
 * 議論（Discussion）。UI に表示される議論全体の状態を1つのまとまりとして持つ。
 * - title: 議論のタイトル（空文字は「無題」として扱う）
 * - participants: 参加者のアバター列
 * - topics: 論点ツリー
 */
export type Discussion = {
  title: string;
  participants: Participant[];
  topics: Topic[];
};
