"use client";

import { useState } from "react";
import type { FlatNode, OpposesOption } from "@/lib/discussion/model";
import { OpposesSelect } from "./OpposesSelect";
import { StatementBody } from "./StatementBody";
import {
  cancelBtnStyle,
  colors,
  darkBtnStyle,
  inlineBoxStyle,
  inlineInputStyle,
  linkBtnStyle,
} from "./ui";

export type RationaleHandlers = {
  onAddRationale: (statementId: string, text: string) => void;
  onEditRationale: (statementId: string, rationaleId: string, text: string) => void;
  onDeleteRationale: (statementId: string, rationaleId: string) => void;
};

type Props = {
  node: FlatNode;
  opposesOptions: OpposesOption[];
  onAddStatement: (containerId: string, text: string, opposesId: string | null) => void;
  onAddSubtopic: (containerId: string, name: string) => void;
  onAddConflict: (statementId: string, text: string) => void;
  rationaleHandlers: RationaleHandlers;
};

/**
 * 論点（またはインデント表示される子論点）1件を描画する。
 * 意見追加・子論点追加・対立意見追加の各インラインフォームの開閉状態は
 * この部品のローカル状態として保持する（StatementBody と同じ方針）。
 */
export function TopicNode({
  node,
  opposesOptions,
  onAddStatement,
  onAddSubtopic,
  onAddConflict,
  rationaleHandlers,
}: Props) {
  const [addingOpinion, setAddingOpinion] = useState(false);
  const [opinionText, setOpinionText] = useState("");
  const [opinionOpposes, setOpinionOpposes] = useState("");
  const [addingSubtopic, setAddingSubtopic] = useState(false);
  const [subtopicDraft, setSubtopicDraft] = useState("");
  const [conflictFor, setConflictFor] = useState<string | null>(null);
  const [conflictDraft, setConflictDraft] = useState("");

  function resetOpinion() {
    setAddingOpinion(false);
    setOpinionText("");
    setOpinionOpposes("");
  }
  function submitOpinion() {
    onAddStatement(node.id, opinionText, opinionOpposes || null);
    resetOpinion();
  }
  function resetSubtopic() {
    setAddingSubtopic(false);
    setSubtopicDraft("");
  }
  function submitSubtopic() {
    onAddSubtopic(node.id, subtopicDraft);
    resetSubtopic();
  }
  function resetConflict() {
    setConflictFor(null);
    setConflictDraft("");
  }
  function submitConflict(statementId: string) {
    onAddConflict(statementId, conflictDraft);
    resetConflict();
  }

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
    : { fontSize: 12.5, fontWeight: 700, color: colors.topicFg };

  return (
    <div style={wrapperStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={nameStyle}>{node.dispName}</div>
        {!addingOpinion && (
          <button
            type="button"
            style={{ ...linkBtnStyle, flex: "none" }}
            onClick={() => setAddingOpinion(true)}
          >
            + 意見を追加
          </button>
        )}
      </div>

      {addingOpinion && (
        <div style={inlineBoxStyle}>
          <input
            aria-label="意見を入力"
            style={inlineInputStyle}
            placeholder="意見を入力…"
            value={opinionText}
            onChange={(e) => setOpinionText(e.target.value)}
          />
          <OpposesSelect
            value={opinionOpposes}
            options={opposesOptions}
            onChange={setOpinionOpposes}
            style={{ fontSize: 10.5, padding: "6px 8px", maxWidth: 150 }}
          />
          <button type="button" style={darkBtnStyle} onClick={submitOpinion}>
            追加
          </button>
          <button type="button" style={cancelBtnStyle} onClick={resetOpinion}>
            取消
          </button>
        </div>
      )}

      {addingSubtopic && (
        <div style={inlineBoxStyle}>
          <input
            aria-label="子論点の名前を入力"
            style={inlineInputStyle}
            placeholder="子論点の名前…"
            value={subtopicDraft}
            onChange={(e) => setSubtopicDraft(e.target.value)}
          />
          <button type="button" style={darkBtnStyle} onClick={submitSubtopic}>
            追加
          </button>
          <button type="button" style={cancelBtnStyle} onClick={resetSubtopic}>
            取消
          </button>
        </div>
      )}

      {/* 対立ペア（クラスタ）: 左にアンカー、右に対立相手を ⚡ 付きで並べる */}
      {node.pairRows.map((row) => (
        <div
          key={row.a.id}
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            background: "#fff",
            border: `1px solid ${colors.border}`,
            borderRadius: 7,
            padding: "12px 14px",
          }}
        >
          <div style={{ flex: 1 }}>
            <StatementBody statement={row.a} {...rationaleHandlers} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {row.others.map((ob) => (
              <div key={ob.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div
                  style={{
                    background: colors.conflict,
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
                  <StatementBody statement={ob} {...rationaleHandlers} />
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
                  border: `1px solid ${colors.border}`,
                  borderRadius: 7,
                  padding: "7px 11px",
                  maxWidth: 280,
                }}
              >
                <StatementBody statement={s} {...rationaleHandlers} />
              </div>
              {conflictFor === s.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 6 }}>
                  <input
                    aria-label="対立する意見を入力"
                    style={{
                      width: 160,
                      fontSize: 10,
                      padding: "4px 7px",
                      border: `1px solid ${colors.conflict}`,
                      borderRadius: 5,
                      color: colors.text,
                    }}
                    placeholder="対立する意見を入力…"
                    value={conflictDraft}
                    onChange={(e) => setConflictDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 5,
                      border: "none",
                      background: colors.conflict,
                      color: "#fff",
                      cursor: "pointer",
                    }}
                    onClick={() => submitConflict(s.id)}
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    style={{ ...cancelBtnStyle, fontSize: 9.5, padding: "3px 8px" }}
                    onClick={resetConflict}
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
                    color: colors.conflictLink,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    border: "none",
                    background: "none",
                  }}
                  onClick={() => setConflictFor(s.id)}
                >
                  ⚡ 対立意見を追加
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!addingSubtopic && (
        <button type="button" style={linkBtnStyle} onClick={() => setAddingSubtopic(true)}>
          + 子論点を追加
        </button>
      )}
    </div>
  );
}
