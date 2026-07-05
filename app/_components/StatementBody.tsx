"use client";

import { useState } from "react";
import type { Statement } from "@/lib/discussion/types";

// デザイン（2c 対立ボード）由来のスタイル定数。
const LINK = "oklch(45% 0.12 265)";
const CONFLICT = "oklch(58% 0.17 25)";
const SAVE_BG = "oklch(45% 0.10 150)";
const RATIONALE_LABEL_BG = "oklch(94% 0.02 265)";
const RATIONALE_LABEL_FG = "oklch(40% 0.08 265)";

const saveBtnStyle: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 5,
  border: "none",
  background: SAVE_BG,
  color: "#fff",
  cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 5,
  border: "1px solid #e5e2da",
  background: "#fff",
  color: "#74716a",
  cursor: "pointer",
};

const editInputStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 10,
  padding: "4px 7px",
  border: `1px solid ${CONFLICT}`,
  borderRadius: 5,
  color: "#3a3833",
};

type Props = {
  statement: Statement;
  onAddRationale: (statementId: string, text: string) => void;
  onEditRationale: (statementId: string, rationaleId: string, text: string) => void;
  onDeleteRationale: (statementId: string, rationaleId: string) => void;
};

/**
 * 意見テキストと根拠（追加・編集・削除）を描画する共通部品。
 * 根拠の編集/追加状態はこの部品のローカル状態として保持する。
 */
export function StatementBody({
  statement,
  onAddRationale,
  onEditRationale,
  onDeleteRationale,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit(rationaleId: string, text: string) {
    setAdding(false);
    setEditingId(rationaleId);
    setDraft(text);
  }

  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setDraft("");
  }

  function cancel() {
    setEditingId(null);
    setAdding(false);
    setDraft("");
  }

  function save() {
    if (editingId) {
      onEditRationale(statement.id, editingId, draft);
    } else if (adding) {
      onAddRationale(statement.id, draft);
    }
    cancel();
  }

  const hasRationales = statement.rationales.length > 0;

  return (
    <>
      <div style={{ fontSize: 11, lineHeight: 1.4, color: "#3a3833" }}>{statement.text}</div>

      {hasRationales && (
        <>
          <div style={{ margin: "6px 0 4px" }}>
            <span
              style={{
                background: RATIONALE_LABEL_BG,
                color: RATIONALE_LABEL_FG,
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 8,
              }}
            >
              根拠
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {statement.rationales.map((r) =>
              editingId === r.id ? (
                <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    style={editInputStyle}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="根拠を編集"
                  />
                  <button type="button" style={saveBtnStyle} onClick={save}>
                    保存
                  </button>
                  <button type="button" style={cancelBtnStyle} onClick={cancel}>
                    取消
                  </button>
                </div>
              ) : (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 6,
                    fontSize: 10,
                    lineHeight: 1.4,
                    color: "#74716a",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      cursor: "pointer",
                      border: "none",
                      background: "none",
                      padding: 0,
                      textAlign: "left",
                      font: "inherit",
                      color: "inherit",
                    }}
                    onClick={() => startEdit(r.id, r.text)}
                  >
                    ・{r.text}
                  </button>
                  <button
                    type="button"
                    aria-label="根拠を削除"
                    style={{
                      color: "#c7c3b8",
                      cursor: "pointer",
                      flex: "none",
                      border: "none",
                      background: "none",
                      padding: 0,
                    }}
                    onClick={() => onDeleteRationale(statement.id, r.id)}
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>
        </>
      )}

      {adding ? (
        <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
          <input
            style={editInputStyle}
            placeholder="根拠を入力…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="根拠を入力"
          />
          <button type="button" style={saveBtnStyle} onClick={save}>
            保存
          </button>
          <button type="button" style={cancelBtnStyle} onClick={cancel}>
            取消
          </button>
        </div>
      ) : (
        <button
          type="button"
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 9.5,
            color: LINK,
            cursor: "pointer",
            border: "none",
            background: "none",
            padding: 0,
          }}
          onClick={startAdd}
        >
          + 根拠を追加
        </button>
      )}
    </>
  );
}
