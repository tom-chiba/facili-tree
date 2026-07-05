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
  normalizeTopics,
  optsFor,
  seedTopics,
} from "@/lib/discussion/model";
import { loadTopics, saveTopics } from "@/lib/discussion/storage";
import type { Topic } from "@/lib/discussion/types";
import { OpposesSelect } from "./OpposesSelect";
import { type RationaleHandlers, TopicNode } from "./TopicNode";
import { colors, darkBtnStyle } from "./ui";

const DISCUSSION_TITLE = "新オフィス フリーアドレス導入 検討会";

const PARTICIPANTS = [
  { initial: "A", bg: "oklch(58% 0.10 265)" },
  { initial: "B", bg: "oklch(58% 0.12 150)" },
  { initial: "C", bg: "oklch(58% 0.13 35)" },
  { initial: "D", bg: "oklch(60% 0.11 85)" },
  { initial: "E", bg: "oklch(55% 0.06 265)" },
];

const footerSelectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 9px",
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  color: colors.ink,
  background: "#faf9f5",
};

type Form = { topic: string; text: string; opposes: string; rationale: string };

export function ConflictBoard() {
  // null = 未マウント（サーバー描画と一致させ、ハイドレーション不一致を避ける）。
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [form, setForm] = useState<Form>({ topic: "", text: "", opposes: "", rationale: "" });

  // マウント後に永続データを読み込む（無ければシード）。読み込みデータは正規化する。
  useEffect(() => {
    const loaded = loadTopics();
    setTopics(loaded ? normalizeTopics(loaded) : seedTopics());
  }, []);

  // 変更のたびに永続化する。
  useEffect(() => {
    if (topics) saveTopics(topics);
  }, [topics]);

  const flatNodes = useMemo(
    () => (topics ? flattenAxisView(computeGroupModel(topics)) : []),
    [topics],
  );
  const topicOptions = useMemo(() => (topics ? flattenTopicOptions(topics) : []), [topics]);
  const currentTopicId = form.topic || topicOptions[0]?.id || "";
  const footerOpposes = useMemo(
    () => (topics ? optsFor(topics, currentTopicId) : []),
    [topics, currentTopicId],
  );

  // ---- 変更ハンドラ（すべて model 経由でイミュータブル更新）----
  const rationaleHandlers: RationaleHandlers = {
    onAddRationale: (sid, text) =>
      setTopics((prev) => (prev ? addRationale(prev, sid, text) : prev)),
    onEditRationale: (sid, rid, text) =>
      setTopics((prev) => (prev ? editRationale(prev, sid, rid, text) : prev)),
    onDeleteRationale: (sid, rid) =>
      setTopics((prev) => (prev ? deleteRationale(prev, sid, rid) : prev)),
  };

  function handleAddStatement(containerId: string, text: string, opposesId: string | null) {
    setTopics((prev) => (prev ? addStatement(prev, containerId, text, opposesId) : prev));
  }
  function handleAddSubtopic(containerId: string, name: string) {
    setTopics((prev) => (prev ? addSubtopic(prev, containerId, name) : prev));
  }
  function handleAddConflict(statementId: string, text: string) {
    setTopics((prev) => (prev ? addConflictStatement(prev, statementId, text) : prev));
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
            borderBottom: `1px solid ${colors.border}`,
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
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.ink }}>
              {DISCUSSION_TITLE}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {PARTICIPANTS.map((p) => (
              <div
                key={p.initial}
                aria-label={`参加者 ${p.initial}`}
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
                opposesOptions={optsFor(topics, node.id)}
                onAddStatement={handleAddStatement}
                onAddSubtopic={handleAddSubtopic}
                onAddConflict={handleAddConflict}
                rationaleHandlers={rationaleHandlers}
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
                borderTop: `1px solid ${colors.border}`,
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
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  color: colors.ink,
                }}
                placeholder="意見を入力…"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              />
              <OpposesSelect
                value={form.opposes}
                options={footerOpposes}
                onChange={(v) => setForm((f) => ({ ...f, opposes: v }))}
              />
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
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  color: colors.muted,
                  background: "#faf9f5",
                }}
                placeholder="根拠（任意）… 例: 過去の調査結果、実体験など"
                value={form.rationale}
                onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
              />
              <button
                type="button"
                style={{ ...darkBtnStyle, fontSize: 12.5, fontWeight: 600, padding: "8px 16px" }}
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
