// 議論マップ（2c 対立ボード）のドメインロジック。
// すべて副作用のない純粋関数として実装し、React から独立して単体テストできるようにする。

import type { Rationale, Statement, Topic } from "./types";

// ---- ID 生成 ---------------------------------------------------------------

/**
 * 新しい一意な ID を生成する。イベントハンドラ（クライアント）からのみ呼ばれる。
 * crypto.randomUUID はブラウザおよび Node/jsdom で利用可能。
 */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

// ---- シードデータ -----------------------------------------------------------

function mk(text: string, rationaleTexts: string[] = []): Statement {
  return {
    id: newId("s"),
    text,
    opposes: null,
    opposesIds: [],
    rationales: rationaleTexts.map((t) => ({ id: newId("r"), text: t })),
  };
}

/** a と b を 1対1 の対立関係で結ぶ。 */
function link(a: Statement, b: Statement): void {
  a.opposes = b.id;
  b.opposes = a.id;
}

/** anchor に対して複数の opponents を対立関係で結ぶ（多対立）。 */
function linkGroup(anchor: Statement, opponents: Statement[]): void {
  for (const o of opponents) {
    anchor.opposesIds.push(o.id);
    o.opposes = anchor.id;
  }
}

/**
 * 初期表示用のサンプル議論（新オフィス フリーアドレス導入 検討会）を生成する。
 * ID は生成のたびに変わるため、永続データが無いときのみ使用する。
 */
export function seedTopics(): Topic[] {
  const s1 = mk("フリーアドレスにして部署間の交流を増やすべき", [
    "他部署との接点が増えるほど新規提案が生まれやすいという社内調査結果がある",
  ]);
  const s2 = mk("チーム単位で島を作った方が連携が取りやすい", [
    "プロジェクト資料や機材をすぐ使える状態にしておきたい",
    "急な相談がしやすく、意思決定が速い",
  ]);
  link(s1, s2);
  const s3 = mk("在宅日が多い人は固定席自体が不要では");
  const s3a = mk("固定席は毎日出社するメンバーの安心感につながる");
  const s3b = mk("毎日出社する人ほど固定席への要望が強いという声がある", [
    "アンケートで固定席希望が7割を占めた",
  ]);
  link(s3a, s3b);

  const s4 = mk("座席数を減らして賃料を下げるべき");
  const s5 = mk("将来の増員を見据えて座席は減らさない方がいい", [
    "来期に中途採用を10名程度予定している",
  ]);
  link(s4, s5);
  const s5b = mk("フリーアドレスなら座席を減らしても困らないはず");
  const s5c = mk("来客対応スペースを削ると商談の印象が悪くなる", [
    "先方オフィス訪問時の第一印象に関わるという声がある",
  ]);
  linkGroup(s4, [s5b, s5c]);

  const s6 = mk("来期の異動と同時に一括導入すべき");
  const s7 = mk("リスクを抑えるため一部フロアから先行導入すべき", [
    "過去のシステム移行で全社一斉導入により混乱した経験がある",
  ]);
  link(s6, s7);
  const s8 = mk("研修期間を考えると年度末が現実的");

  const b1 = mk("個人ロッカーを増設すべき");
  const b2 = mk("共有ワゴンで十分", ["備品費を抑えられる"]);
  link(b1, b2);

  return [
    {
      id: newId("t"),
      name: "座席のルール",
      statements: [s1, s2, s3, s3a, s3b],
      subtopics: [
        {
          id: newId("t"),
          name: "荷物・私物の管理ルール",
          statements: [b1, b2],
          subtopics: [],
        },
      ],
    },
    { id: newId("t"), name: "コスト", statements: [s4, s5b, s5c, s5], subtopics: [] },
    { id: newId("t"), name: "導入スケジュール", statements: [s6, s7, s8], subtopics: [] },
  ];
}

// ---- グループ化（対立ペア / 対立なし）--------------------------------------

/** 対立ペアの1行。a がアンカー、others が a と対立する意見群。 */
export type PairRow = {
  a: Statement;
  others: Statement[];
};

export type StatementGroups = {
  pairRows: PairRow[];
  singles: Statement[];
  hasSingles: boolean;
};

/**
 * 意見群を「対立ペア」と「対立なし（single）」に分割する。
 * opposes（1対1）と opposesIds（多対立）の両方を考慮する。
 */
export function splitGroupsMulti(statements: Statement[]): StatementGroups {
  const visited = new Set<string>();
  const pairRows: PairRow[] = [];
  const singles: Statement[] = [];
  for (const s of statements) {
    if (visited.has(s.id)) continue;
    const oppIds = [...s.opposesIds, ...(s.opposes ? [s.opposes] : [])];
    const others = oppIds
      .map((id) => statements.find((x) => x.id === id))
      .filter((x): x is Statement => !!x && !visited.has(x.id));
    if (others.length > 0) {
      pairRows.push({ a: s, others });
      visited.add(s.id);
      for (const o of others) visited.add(o.id);
      continue;
    }
    singles.push(s);
    visited.add(s.id);
  }
  return { pairRows, singles, hasSingles: singles.length > 0 };
}

export type GroupedTopic = Topic &
  StatementGroups & {
    subtopics: GroupedTopic[];
  };

/** 各論点の意見をグループ化し、subtopics も再帰的に処理する。 */
export function computeGroupModel(topics: Topic[]): GroupedTopic[] {
  return topics.map((t) => ({
    ...t,
    ...splitGroupsMulti(t.statements),
    subtopics: computeGroupModel(t.subtopics),
  }));
}

// ---- 平坦化（描画用）-------------------------------------------------------

export type FlatNode = GroupedTopic & {
  depth: number;
  isSub: boolean;
  dispName: string;
};

/** グループ化済みツリーを、深さ情報付きの平坦なリストに変換する（描画用）。 */
export function flattenAxisView(nodes: GroupedTopic[], depth = 0): FlatNode[] {
  const out: FlatNode[] = [];
  for (const n of nodes) {
    const isSub = depth > 0;
    out.push({ ...n, depth, isSub, dispName: isSub ? `└ ${n.name}` : n.name });
    out.push(...flattenAxisView(n.subtopics, depth + 1));
  }
  return out;
}

export type TopicOption = { id: string; name: string };

/** フッターの論点セレクト用に、入れ子をインデント付きで平坦化する。 */
export function flattenTopicOptions(topics: Topic[], depth = 0): TopicOption[] {
  const opts: TopicOption[] = [];
  for (const t of topics) {
    opts.push({
      id: t.id,
      name: (depth > 0 ? `${"　".repeat(depth)}└ ` : "") + t.name,
    });
    opts.push(...flattenTopicOptions(t.subtopics, depth + 1));
  }
  return opts;
}

export type OpposesOption = { id: string; text: string };

/** 指定した論点内の意見を、対立相手セレクトの選択肢（短縮テキスト）にする。 */
export function optsFor(topics: Topic[], topicId: string | null): OpposesOption[] {
  if (!topicId) return [];
  const t = findContainer(topics, topicId);
  if (!t) return [];
  return t.statements.map((s) => ({
    id: s.id,
    text: s.text.length > 18 ? `${s.text.slice(0, 18)}…` : s.text,
  }));
}

// ---- ツリー操作（イミュータブル）------------------------------------------

/** id で論点（コンテナ）を再帰的に探す。 */
export function findContainer(topics: Topic[], containerId: string): Topic | null {
  for (const t of topics) {
    if (t.id === containerId) return t;
    const found = findContainer(t.subtopics, containerId);
    if (found) return found;
  }
  return null;
}

/** 指定コンテナに fn を適用した新しいツリーを返す。 */
export function updateContainer(
  topics: Topic[],
  containerId: string,
  fn: (t: Topic) => Topic,
): Topic[] {
  return topics.map((t) => {
    if (t.id === containerId) return fn(t);
    return { ...t, subtopics: updateContainer(t.subtopics, containerId, fn) };
  });
}

/** すべてのコンテナに fn を適用した新しいツリーを返す。 */
export function mapContainersDeep(topics: Topic[], fn: (t: Topic) => Topic): Topic[] {
  return topics.map((t) => {
    const updated = fn(t);
    return { ...updated, subtopics: mapContainersDeep(updated.subtopics, fn) };
  });
}

/** すべての意見に fn を適用した新しいツリーを返す。 */
export function mapStatementsDeep(topics: Topic[], fn: (s: Statement) => Statement): Topic[] {
  return topics.map((t) => ({
    ...t,
    statements: t.statements.map(fn),
    subtopics: mapStatementsDeep(t.subtopics, fn),
  }));
}

// ---- 変更操作 ---------------------------------------------------------------

/**
 * 指定した論点に意見を追加する。opposesId 指定時は相手意見と双方向に対立を張る。
 * rationaleText があれば根拠を1件付ける。
 */
export function addStatement(
  topics: Topic[],
  containerId: string,
  text: string,
  opposesId: string | null,
  rationaleText = "",
): Topic[] {
  const body = text.trim();
  if (!body) return topics;
  const sid = newId("s");
  const rt = rationaleText.trim();
  const rationales: Rationale[] = rt ? [{ id: newId("r"), text: rt }] : [];
  const newStatement: Statement = {
    id: sid,
    text: body,
    opposes: opposesId || null,
    opposesIds: [],
    rationales,
  };
  return updateContainer(topics, containerId, (c) => {
    const statements = c.statements.map((st) =>
      st.id === opposesId ? { ...st, opposes: sid } : st,
    );
    return { ...c, statements: [...statements, newStatement] };
  });
}

/** 指定した意見に対して対立する意見を、同じ論点内に追加する。 */
export function addConflictStatement(topics: Topic[], statementId: string, text: string): Topic[] {
  const body = text.trim();
  if (!body) return topics;
  const sid = newId("s");
  const newStatement: Statement = {
    id: sid,
    text: body,
    opposes: statementId,
    opposesIds: [],
    rationales: [],
  };
  return mapContainersDeep(topics, (c) => {
    if (!c.statements.some((x) => x.id === statementId)) return c;
    const statements = c.statements.map((x) => (x.id === statementId ? { ...x, opposes: sid } : x));
    return { ...c, statements: [...statements, newStatement] };
  });
}

/** 指定コンテナに子論点を追加する。 */
export function addSubtopic(topics: Topic[], containerId: string, name: string): Topic[] {
  const nm = name.trim();
  if (!nm) return topics;
  const newSub: Topic = { id: newId("t"), name: nm, statements: [], subtopics: [] };
  return updateContainer(topics, containerId, (c) => ({
    ...c,
    subtopics: [...c.subtopics, newSub],
  }));
}

/** 指定意見に根拠を追加する。 */
export function addRationale(topics: Topic[], statementId: string, text: string): Topic[] {
  const body = text.trim();
  if (!body) return topics;
  const rid = newId("r");
  return mapStatementsDeep(topics, (s) =>
    s.id === statementId ? { ...s, rationales: [...s.rationales, { id: rid, text: body }] } : s,
  );
}

/** 指定根拠のテキストを更新する。空文字なら変更しない。 */
export function editRationale(
  topics: Topic[],
  statementId: string,
  rationaleId: string,
  text: string,
): Topic[] {
  const body = text.trim();
  if (!body) return topics;
  return mapStatementsDeep(topics, (s) =>
    s.id === statementId
      ? {
          ...s,
          rationales: s.rationales.map((r) => (r.id === rationaleId ? { ...r, text: body } : r)),
        }
      : s,
  );
}

/** 指定根拠を削除する。 */
export function deleteRationale(
  topics: Topic[],
  statementId: string,
  rationaleId: string,
): Topic[] {
  return mapStatementsDeep(topics, (s) =>
    s.id === statementId
      ? { ...s, rationales: s.rationales.filter((r) => r.id !== rationaleId) }
      : s,
  );
}
