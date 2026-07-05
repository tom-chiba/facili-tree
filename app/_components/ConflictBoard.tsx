"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addConflictStatement,
  addRationale,
  addStatement,
  addSubtopic,
  computeGroupModel,
  deleteRationale,
  editRationale,
  flattenAxisView,
  flattenTopicOptions,
  type FlatNode,
  optsFor,
  seedTopics,
} from "@/lib/discussion/model";
import { loadTopics, saveTopics } from "@/lib/discussion/storage";
import type { Topic } from "@/lib/discussion/types";
import { StatementBody } from "./StatementBody";

// ---- デザイン由来の定数 -----------------------------------------------------

const DISCUSSION_TITLE = "新オフィス フリーアドレス導入 検討会";
const CONFLICT = "oklch(58% 0.17 25)";
const LINK = "oklch(45% 0.12 265)";
const TOPIC_FG = "oklch(35% 0.08 265)";

const PARTICIPANTS = [
  { initial: "A", bg: "oklch(58% 0.10 265)" },
  { initial: "B", bg: "oklch(58% 0.12 150)" },
  { initial: "C", bg: "oklch(58% 0.13 35)" },
  { initial: "D", bg: "oklch(60% 0.11 85)" },
  { initial: "E", bg: "oklch(55% 0.06 265)" },
];

const addBtnStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "5px 10px",
  borderRadius: 5,
  border: "none",
  background: "#23221f",
  color: "#fff",
  cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  padding: "5px 10px",
  borderRadius: 5,
  border: "1px solid #e5e2da",
  background: "#fff",
  color: "#74716a",
  cursor: "pointer",
};

const linkBtnStyle: React.CSSProperties = {
  fontSize: 10,
  color: LINK,
  cursor: "pointer",
  border: "none",
  background: "none",
  padding: 0,
  textAlign: "left",
};

const inlineInputStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 11,
  padding: "6px 9px",
  border: `1px solid ${LINK}`,
  borderRadius: 5,
  color: "#3a3833",
};

const inlineBoxStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  background: "#fff",
  border: "1px solid #e5e2da",
  borderRadius: 8,
  padding: 8,
};

const footerSelectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 9px",
  border: "1px solid #e5e2da",
  borderRadius: 6,
  color: "#23221f",
  background: "#faf9f5",
};

const opposesSelectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 9px",
  border: "1px solid #e5e2da",
  borderRadius: 6,
  color: "oklch(45% 0.12 25)",
  background: "oklch(97% 0.02 25)",
  maxWidth: 190,
};

// ---- コンポーネント本体 -----------------------------------------------------

type Form = { topic: string; text: string; opposes: string; rationale: string };

export function ConflictBoard() {
  // null = 未マウント（サーバー描画と一致させ、ハイドレーション不一致を避ける）。
  const [topics, setTopics] = useState<Topic[] | null>(null);

  // インライン編集の対象。
  const [opinionAddFor, setOpinionAddFor] = useState<string | null>(null);
  const [opinionText, setOpinionText] = useState("");
  const [opinionOpposes, setOpinionOpposes] = useState("");
  const [subtopicAddFor, setSubtopicAddFor] = useState<string | null>(null);
  const [subtopicDraft, setSubtopicDraft] = useState("");
  const [conflictAddFor, setConflictAddFor] = useState<string | null>(null);
  const [conflictDraft, setConflictDraft] = useState("");

  // フッターの追加フォーム。
  const [form, setForm] = useState<Form>({ topic: "", text: "", opposes: "", rationale: "" });

  // マウント後に永続データを読み込む（無ければシード）。
  useEffect(() => {
    setTopics(loadTopics() ?? seedTopics());
  }, []);

  // 変更のたびに永続化する。
  useEffect(() => {
    if (topics) saveTopics(topics);
  }, [topics]);

  const flatNodes: FlatNode[] = useMemo(
    () => (topics ? flattenAxisView(computeGroupModel(topics)) : []),
    [topics],
  );
  const topicOptions = useMemo(() => (topics ? flattenTopicOptions(topics) : []), [topics]);
  const currentTopicId = form.topic || topicOptions[0]?.id || "";
  const footerOpposes = useMemo(
    () => (topics ? optsFor(topics, currentTopicId) : []),
    [topics, currentTopicId],
  );

  // ---- ハンドラ ----
  function cancelOpinionAdd() {
    setOpinionAddFor(null);
    setOpinionText("");
    setOpinionOpposes("");
  }
  function startOpinionAdd(containerId: string) {
    setSubtopicAddFor(null);
    setOpinionAddFor(containerId);
    setOpinionText("");
    setOpinionOpposes("");
  }
  function saveOpinionAdd(containerId: string) {
    setTopics((prev) =>
      prev ? addStatement(prev, containerId, opinionText, opinionOpposes || null) : prev,
    );
    cancelOpinionAdd();
  }

  function cancelSubtopicAdd() {
    setSubtopicAddFor(null);
    setSubtopicDraft("");
  }
  function startSubtopicAdd(containerId: string) {
    setOpinionAddFor(null);
    setSubtopicAddFor(containerId);
    setSubtopicDraft("");
  }
  function saveSubtopicAdd(containerId: string) {
    setTopics((prev) => (prev ? addSubtopic(prev, containerId, subtopicDraft) : prev));
    cancelSubtopicAdd();
  }

  function cancelConflictAdd() {
    setConflictAddFor(null);
    setConflictDraft("");
  }
  function startConflictAdd(statementId: string) {
    setConflictAddFor(statementId);
    setConflictDraft("");
  }
  function saveConflictAdd(statementId: string) {
    setTopics((prev) => (prev ? addConflictStatement(prev, statementId, conflictDraft) : prev));
    cancelConflictAdd();
  }

  function handleAddRationale(statementId: string, text: string) {
    setTopics((prev) => (prev ? addRationale(prev, statementId, text) : prev));
  }
  function handleEditRationale(statementId: string, rationaleId: string, text: string) {
    setTopics((prev) => (prev ? editRationale(prev, statementId, rationaleId, text) : prev));
  }
  function handleDeleteRationale(statementId: string, rationaleId: string) {
    setTopics((prev) => (prev ? deleteRationale(prev, statementId, rationaleId) : prev));
  }

  function addFromFooter() {
    if (!currentTopicId) return;
    setTopics((prev) =>
      prev
        ? addStatement(prev, currentTopicId, form.text, form.opposes || null, form.rationale)
        : prev,
    );
    setForm((f) => ({ topic: f.topic, text: "", opposes: "", rationale: "" }));
  }

  const rationaleProps = {
    onAddRationale: handleAddRationale,
    onEditRationale: handleEditRationale,
    onDeleteRationale: handleDeleteRationale,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eeece6",
        padding: 24,
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.08)",
          borderRadius: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,.06)",
          overflow: "hidden",
          alignSelf: "flex-start",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid #e5e2da",
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "oklch(58% 0.15 35)",
              }}
            />
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#23221f" }}>
              {DISCUSSION_TITLE}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {PARTICIPANTS.map((p) => (
              <div
                key={p.initial}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: p.bg,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #fff",
                  marginLeft: -6,
                }}
              >
                {p.initial}
              </div>
            ))}
          </div>
        </div>

        {/* ボード本体 */}
        <div
          style={{
            minHeight: 400,
            maxHeight: "70vh",
            background: "#faf9f5",
            overflow: "auto",
            padding: 24,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {topics === null ? (
            <div style={{ color: "#9b988f", fontSize: 12.5 }}>読み込み中…</div>
          ) : (
            flatNodes.map((node) => (
              <TopicNode
                key={node.id}
                node={node}
                opinionAddFor={opinionAddFor}
                opinionText={opinionText}
                opinionOpposes={opinionOpposes}
                subtopicAddFor={subtopicAddFor}
                subtopicDraft={subtopicDraft}
                conflictAddFor={conflictAddFor}
                conflictDraft={conflictDraft}
                opposesOptions={topics ? optsFor(topics, node.id) : []}
                onSetOpinionText={setOpinionText}
                onSetOpinionOpposes={setOpinionOpposes}
                onSetSubtopicDraft={setSubtopicDraft}
                onSetConflictDraft={setConflictDraft}
                onStartOpinionAdd={startOpinionAdd}
                onSaveOpinionAdd={saveOpinionAdd}
                onCancelOpinionAdd={cancelOpinionAdd}
                onStartSubtopicAdd={startSubtopicAdd}
                onSaveSubtopicAdd={saveSubtopicAdd}
                onCancelSubtopicAdd={cancelSubtopicAdd}
                onStartConflictAdd={startConflictAdd}
                onSaveConflictAdd={saveConflictAdd}
                onCancelConflictAdd={cancelConflictAdd}
                rationaleProps={rationaleProps}
              />
            ))
          )}
        </div>

        {/* フッター（追加フォーム） */}
        {topics !== null && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 20px",
                borderTop: "1px solid #e5e2da",
                background: "#fff",
              }}
            >
              <select
                aria-label="論点を選択"
                style={footerSelectStyle}
                value={currentTopicId}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value, opposes: "" }))}
              >
                {topicOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                aria-label="意見を入力"
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  padding: "8px 12px",
                  border: "1px solid #e5e2da",
                  borderRadius: 6,
                  color: "#23221f",
                }}
                placeholder="意見を入力…"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              />
              <select
                aria-label="対立する意見を選択"
                style={opposesSelectStyle}
                value={form.opposes}
                onChange={(e) => setForm((f) => ({ ...f, opposes: e.target.value }))}
              >
                <option value="">対立なし</option>
                {footerOpposes.map((o) => (
                  <option key={o.id} value={o.id}>
                    ⚡ {o.text}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 20px 14px",
                background: "#fff",
              }}
            >
              <input
                aria-label="根拠を入力（任意）"
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: "7px 12px",
                  border: "1px solid #e5e2da",
                  borderRadius: 6,
                  color: "#74716a",
                  background: "#faf9f5",
                }}
                placeholder="根拠（任意）… 例: 過去の調査結果、実体験など"
                value={form.rationale}
                onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
              />
              <button
                type="button"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#23221f",
                  color: "#fff",
                  cursor: "pointer",
                }}
                onClick={addFromFooter}
              >
                追加
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- 論点ノード -------------------------------------------------------------

type RationaleProps = {
  onAddRationale: (statementId: string, text: string) => void;
  onEditRationale: (statementId: string, rationaleId: string, text: string) => void;
  onDeleteRationale: (statementId: string, rationaleId: string) => void;
};

type TopicNodeProps = {
  node: FlatNode;
  opinionAddFor: string | null;
  opinionText: string;
  opinionOpposes: string;
  subtopicAddFor: string | null;
  subtopicDraft: string;
  conflictAddFor: string | null;
  conflictDraft: string;
  opposesOptions: { id: string; text: string }[];
  onSetOpinionText: (v: string) => void;
  onSetOpinionOpposes: (v: string) => void;
  onSetSubtopicDraft: (v: string) => void;
  onSetConflictDraft: (v: string) => void;
  onStartOpinionAdd: (id: string) => void;
  onSaveOpinionAdd: (id: string) => void;
  onCancelOpinionAdd: () => void;
  onStartSubtopicAdd: (id: string) => void;
  onSaveSubtopicAdd: (id: string) => void;
  onCancelSubtopicAdd: () => void;
  onStartConflictAdd: (id: string) => void;
  onSaveConflictAdd: (id: string) => void;
  onCancelConflictAdd: () => void;
  rationaleProps: RationaleProps;
};

function TopicNode(props: TopicNodeProps) {
  const { node, rationaleProps } = props;
  const wrapperStyle: React.CSSProperties = node.isSub
    ? {
        marginLeft: 6 + (node.depth - 1) * 20,
        padding: "10px 0 0 14px",
        borderLeft: "2px dashed #ded9cc",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }
    : { display: "flex", flexDirection: "column", gap: 8 };
  const nameStyle: React.CSSProperties = node.isSub
    ? { fontSize: 11, fontWeight: 700, color: "#8a8779" }
    : { fontSize: 12.5, fontWeight: 700, color: TOPIC_FG };

  return (
    <div style={wrapperStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={nameStyle}>{node.dispName}</div>
        {props.opinionAddFor !== node.id && (
          <button
            type="button"
            style={{ ...linkBtnStyle, flex: "none" }}
            onClick={() => props.onStartOpinionAdd(node.id)}
          >
            + 意見を追加
          </button>
        )}
      </div>

      {props.opinionAddFor === node.id && (
        <div style={inlineBoxStyle}>
          <input
            aria-label="意見を入力"
            style={inlineInputStyle}
            placeholder="意見を入力…"
            value={props.opinionText}
            onChange={(e) => props.onSetOpinionText(e.target.value)}
          />
          <select
            aria-label="対立する意見を選択"
            style={{ ...opposesSelectStyle, fontSize: 10.5, padding: "6px 8px", maxWidth: 150 }}
            value={props.opinionOpposes}
            onChange={(e) => props.onSetOpinionOpposes(e.target.value)}
          >
            <option value="">対立なし</option>
            {props.opposesOptions.map((o) => (
              <option key={o.id} value={o.id}>
                ⚡ {o.text}
              </option>
            ))}
          </select>
          <button type="button" style={addBtnStyle} onClick={() => props.onSaveOpinionAdd(node.id)}>
            追加
          </button>
          <button type="button" style={cancelBtnStyle} onClick={props.onCancelOpinionAdd}>
            取消
          </button>
        </div>
      )}

      {props.subtopicAddFor === node.id && (
        <div style={inlineBoxStyle}>
          <input
            aria-label="子論点の名前を入力"
            style={inlineInputStyle}
            placeholder="子論点の名前…"
            value={props.subtopicDraft}
            onChange={(e) => props.onSetSubtopicDraft(e.target.value)}
          />
          <button
            type="button"
            style={addBtnStyle}
            onClick={() => props.onSaveSubtopicAdd(node.id)}
          >
            追加
          </button>
          <button type="button" style={cancelBtnStyle} onClick={props.onCancelSubtopicAdd}>
            取消
          </button>
        </div>
      )}

      {/* 対立ペア */}
      {node.pairRows.map((row) => (
        <div
          key={row.a.id}
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            background: "#fff",
            border: "1px solid #e5e2da",
            borderRadius: 7,
            padding: "12px 14px",
          }}
        >
          <div style={{ flex: 1 }}>
            <StatementBody statement={row.a} {...rationaleProps} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {row.others.map((ob) => (
              <div key={ob.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div
                  style={{
                    background: CONFLICT,
                    color: "#fff",
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: 9,
                    whiteSpace: "nowrap",
                    flex: "none",
                  }}
                >
                  ⚡
                </div>
                <div style={{ flex: 1 }}>
                  <StatementBody statement={ob} {...rationaleProps} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 対立なしの意見 */}
      {node.hasSingles && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {node.singles.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e2da",
                  borderRadius: 7,
                  padding: "7px 11px",
                  maxWidth: 280,
                }}
              >
                <StatementBody statement={s} {...rationaleProps} />
              </div>
              {props.conflictAddFor === s.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 6 }}>
                  <input
                    aria-label="対立する意見を入力"
                    style={{
                      width: 160,
                      fontSize: 10,
                      padding: "4px 7px",
                      border: `1px solid ${CONFLICT}`,
                      borderRadius: 5,
                      color: "#3a3833",
                    }}
                    placeholder="対立する意見を入力…"
                    value={props.conflictDraft}
                    onChange={(e) => props.onSetConflictDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 5,
                      border: "none",
                      background: CONFLICT,
                      color: "#fff",
                      cursor: "pointer",
                    }}
                    onClick={() => props.onSaveConflictAdd(s.id)}
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    style={{ ...cancelBtnStyle, fontSize: 9.5, padding: "3px 8px" }}
                    onClick={props.onCancelConflictAdd}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{
                    flex: "none",
                    paddingTop: 8,
                    fontSize: 9.5,
                    color: "oklch(50% 0.16 25)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    border: "none",
                    background: "none",
                  }}
                  onClick={() => props.onStartConflictAdd(s.id)}
                >
                  ⚡ 対立意見を追加
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {props.subtopicAddFor !== node.id && (
        <button
          type="button"
          style={linkBtnStyle}
          onClick={() => props.onStartSubtopicAdd(node.id)}
        >
          + 子論点を追加
        </button>
      )}
    </div>
  );
}
