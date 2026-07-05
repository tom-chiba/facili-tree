"use client";

import { useState } from "react";
import type { Participant } from "@/lib/discussion/types";
import { cancelBtnStyle, colors, darkBtnStyle, participantColor } from "./ui";

/** タイトル未設定時にヘッダーへ表示するプレースホルダ見出し。 */
export const UNTITLED = "無題の議論";

type Props = {
  title: string;
  participants: Participant[];
  onChangeTitle: (title: string) => void;
  onAddParticipant: (name: string) => void;
  onRemoveParticipant: (id: string) => void;
};

const avatarSize = 22;

/** アバターに表示する頭文字（サロゲートペア安全に先頭1文字）。 */
function initialOf(name: string): string {
  return Array.from(name)[0] ?? "?";
}

/**
 * 議論ヘッダー。タイトルのインライン編集と参加者（アバター）の追加・削除を担う。
 * 各インライン編集の開閉状態はこの部品のローカル状態として保持する。
 */
export function DiscussionHeader({
  title,
  participants,
  onChangeTitle,
  onAddParticipant,
  onRemoveParticipant,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [participantDraft, setParticipantDraft] = useState("");

  function startEditTitle() {
    setTitleDraft(title);
    setEditingTitle(true);
  }
  function commitTitle() {
    onChangeTitle(titleDraft.trim());
    setEditingTitle(false);
  }
  function cancelTitle() {
    setEditingTitle(false);
    setTitleDraft("");
  }

  function submitParticipant() {
    onAddParticipant(participantDraft);
    setParticipantDraft("");
    setAddingParticipant(false);
  }
  function cancelParticipant() {
    setAddingParticipant(false);
    setParticipantDraft("");
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "16px 22px",
        borderBottom: `1px solid ${colors.border}`,
        background: "#fff",
      }}
    >
      {/* タイトル */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "oklch(58% 0.15 35)",
            flex: "none",
          }}
        />
        {editingTitle ? (
          <input
            aria-label="議論タイトルを編集"
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 15,
              fontWeight: 600,
              padding: "4px 8px",
              border: `1px solid ${colors.link}`,
              borderRadius: 5,
              color: colors.ink,
            }}
            placeholder="議論のタイトルを入力…"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") cancelTitle();
            }}
            onBlur={commitTitle}
          />
        ) : (
          <h1 style={{ margin: 0, minWidth: 0 }}>
            <button
              type="button"
              aria-label="タイトルを編集"
              style={{
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                textAlign: "left",
                color: title ? colors.ink : "#9b988f",
              }}
              onClick={startEditTitle}
            >
              {title || UNTITLED}
            </button>
          </h1>
        )}
      </div>

      {/* 参加者アバター */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {participants.map((p, i) => (
            <div key={p.id} style={{ position: "relative", marginLeft: i === 0 ? 0 : -6 }}>
              <div
                aria-label={`参加者 ${p.name}`}
                title={p.name}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: "50%",
                  background: participantColor(i),
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #fff",
                }}
              >
                {initialOf(p.name)}
              </div>
              <button
                type="button"
                aria-label={`参加者 ${p.name} を削除`}
                onClick={() => onRemoveParticipant(p.id)}
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "1px solid #fff",
                  background: "#b4b0a6",
                  color: "#fff",
                  fontSize: 9,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {addingParticipant ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              aria-label="参加者名を入力"
              style={{
                width: 96,
                fontSize: 11,
                padding: "5px 8px",
                border: `1px solid ${colors.link}`,
                borderRadius: 5,
                color: colors.text,
              }}
              placeholder="参加者名…"
              value={participantDraft}
              onChange={(e) => setParticipantDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitParticipant();
                if (e.key === "Escape") cancelParticipant();
              }}
            />
            <button type="button" style={darkBtnStyle} onClick={submitParticipant}>
              追加
            </button>
            <button type="button" style={cancelBtnStyle} onClick={cancelParticipant}>
              取消
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="参加者を追加"
            onClick={() => setAddingParticipant(true)}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              border: `1px dashed ${colors.border}`,
              background: "#faf9f5",
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              marginLeft: participants.length > 0 ? 2 : 0,
            }}
          >
            ＋
          </button>
        )}
      </div>
    </div>
  );
}
