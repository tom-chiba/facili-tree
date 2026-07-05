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
    opposesIds: [],
    rationales: rationaleTexts.map((t) => ({ id: newId("r"), text: t })),
  };
}

/** a と b を対立関係で結ぶ（対称に双方へ張る）。 */
function link(a: Statement, b: Statement): void {
  a.opposesIds.push(b.id);
  b.opposesIds.push(a.id);
}

/** anchor に対して複数の opponents を対立関係で結ぶ（多対立、対称）。 */
function linkGroup(anchor: Statement, opponents: Statement[]): void {
  for (const o of opponents) link(anchor, o);
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
 * 意見群を「対立クラスタ（対立ペア）」と「対立なし（single）」に分割する。
 * 対立を無向グラフとみなし連結成分を求めるため、配列順に依存しない。
 * 各クラスタの表示アンカー（左側）は、クラスタ内で最も多くの相手と対立する意見
 * （同数なら配列で先に現れる意見）を選ぶ。
 */
export function splitGroupsMulti(statements: Statement[]): StatementGroups {
  const byId = new Map(statements.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const pairRows: PairRow[] = [];
  const singles: Statement[] = [];

  for (const start of statements) {
    if (visited.has(start.id)) continue;

    // start を含む連結成分（クラスタ）を幅優先で収集する。
    const clusterIds = new Set<string>([start.id]);
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift() as Statement;
      for (const oid of cur.opposesIds) {
        if (!clusterIds.has(oid) && byId.has(oid)) {
          clusterIds.add(oid);
          queue.push(byId.get(oid) as Statement);
        }
      }
    }
    for (const id of clusterIds) visited.add(id);

    if (clusterIds.size === 1) {
      singles.push(start);
      continue;
    }

    // クラスタ内メンバーを配列順で並べ、対立次数が最大のものをアンカーにする。
    const members = statements.filter((s) => clusterIds.has(s.id));
    const degreeInCluster = (s: Statement) =>
      s.opposesIds.filter((id) => clusterIds.has(id)).length;
    let anchor = members[0];
    for (const m of members) {
      if (degreeInCluster(m) > degreeInCluster(anchor)) anchor = m;
    }
    const others = members.filter((s) => s.id !== anchor.id);
    pairRows.push({ a: anchor, others });
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

// 平坦化後は各ノードを独立した表示単位として扱うため、入れ子（subtopics）は保持しない。
export type FlatNode = Omit<GroupedTopic, "subtopics"> & {
  depth: number;
  isSub: boolean;
  dispName: string;
};

/** グループ化済みツリーを、深さ情報付きの平坦なリストに変換する（描画用）。 */
export function flattenAxisView(nodes: GroupedTopic[], depth = 0): FlatNode[] {
  const out: FlatNode[] = [];
  for (const n of nodes) {
    const { subtopics, ...rest } = n;
    const isSub = depth > 0;
    out.push({ ...rest, depth, isSub, dispName: isSub ? `└ ${n.name}` : n.name });
    out.push(...flattenAxisView(subtopics, depth + 1));
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

/**
 * 対立先として安全に選べる意見の id 集合を返す。
 * 表示モデルは「1クラスタ＝1アンカー対複数」のスター型を前提とするため、
 * 対立なし（single）または既存クラスタのアンカーのみを候補とする。
 * 葉（アンカー以外の対立中の意見）を対立先にすると非スター型クラスタが生じ、
 * 実在しない対立関係が描画されてしまうため除外する。
 */
function safeConflictTargetIds(statements: Statement[]): Set<string> {
  const { pairRows, singles } = splitGroupsMulti(statements);
  const ids = new Set<string>();
  for (const s of singles) ids.add(s.id);
  for (const row of pairRows) ids.add(row.a.id);
  return ids;
}

/** 指定した論点内で対立先に選べる意見を、セレクトの選択肢（短縮テキスト）にする。 */
export function optsFor(topics: Topic[], topicId: string | null): OpposesOption[] {
  if (!topicId) return [];
  const t = findContainer(topics, topicId);
  if (!t) return [];
  const allowed = safeConflictTargetIds(t.statements);
  return t.statements
    .filter((s) => allowed.has(s.id))
    .map((s) => ({
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
 * 指定した論点に意見を追加する。opposesId 指定時は相手意見と対称に対立を張る
 * （相手が既に別の意見と対立していても上書きせず追加する）。
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
    opposesIds: opposesId ? [opposesId] : [],
    rationales,
  };
  return updateContainer(topics, containerId, (c) => {
    const statements = c.statements.map((st) =>
      st.id === opposesId ? { ...st, opposesIds: [...st.opposesIds, sid] } : st,
    );
    return { ...c, statements: [...statements, newStatement] };
  });
}

/** 指定した意見に対して対立する意見を、同じ論点内に対称な対立関係で追加する。 */
export function addConflictStatement(topics: Topic[], statementId: string, text: string): Topic[] {
  const body = text.trim();
  if (!body) return topics;
  const sid = newId("s");
  const newStatement: Statement = {
    id: sid,
    text: body,
    opposesIds: [statementId],
    rationales: [],
  };
  return mapContainersDeep(topics, (c) => {
    if (!c.statements.some((x) => x.id === statementId)) return c;
    const statements = c.statements.map((x) =>
      x.id === statementId ? { ...x, opposesIds: [...x.opposesIds, sid] } : x,
    );
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

// ---- 正規化（永続データ読み込み時の検証）-----------------------------------

type RawObject = Record<string, unknown>;

function asObject(v: unknown): RawObject {
  return typeof v === "object" && v !== null ? (v as RawObject) : {};
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asStringArray(v: unknown): string[] {
  return asArray(v).filter((x): x is string => typeof x === "string");
}

function normalizeStatement(raw: unknown): Statement {
  const o = asObject(raw);
  return {
    id: asString(o.id) || newId("s"),
    text: asString(o.text),
    opposesIds: asStringArray(o.opposesIds),
    rationales: asArray(o.rationales).map((r) => {
      const ro = asObject(r);
      return { id: asString(ro.id) || newId("r"), text: asString(ro.text) };
    }),
  };
}

function normalizeTopic(raw: unknown): Topic {
  const o = asObject(raw);
  return {
    id: asString(o.id) || newId("t"),
    name: asString(o.name),
    statements: asArray(o.statements).map(normalizeStatement),
    subtopics: asArray(o.subtopics).map(normalizeTopic),
  };
}

/**
 * 永続化された（型が保証されない）データを検証して Topic[] に整える。
 * 配列でない・フィールド欠落・型不一致でも例外を出さず、既定値で補う。
 */
export function normalizeTopics(raw: unknown): Topic[] {
  return asArray(raw).map(normalizeTopic);
}
