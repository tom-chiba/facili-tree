"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addConflictStatement,
  addParticipant,
  addRationale,
  addStatement,
  addSubtopic,
  addTopic,
  computeGroupModel,
  deleteRationale,
  editRationale,
  emptyDiscussion,
  flattenAxisView,
  flattenTopicOptions,
  normalizeDiscussion,
  opposesOptionsOf,
  removeParticipant,
} from "@/lib/discussion/model";
import { loadDiscussion, saveDiscussion } from "@/lib/discussion/storage";
import type { Discussion, Topic } from "@/lib/discussion/types";
import { DiscussionHeader } from "./DiscussionHeader";
import { OpposesSelect } from "./OpposesSelect";
import { type RationaleHandlers, TopicNode } from "./TopicNode";
import { cancelBtnStyle, colors, darkBtnStyle, inlineInputStyle, linkBtnStyle } from "./ui";

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
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [form, setForm] = useState<Form>({ topic: "", text: "", opposes: "", rationale: "" });
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");

  // マウント後に永続データを読み込む。生値を検証・正規化し、無ければ空の議論から始める。
  useEffect(() => {
    const loaded = loadDiscussion();
    setDiscussion(loaded === null ? emptyDiscussion() : normalizeDiscussion(loaded));
  }, []);

  // 変更のたびに永続化する。
  useEffect(() => {
    if (discussion) saveDiscussion(discussion);
  }, [discussion]);

  const topics = discussion?.topics ?? null;
  const flatNodes = useMemo(
    () => (topics ? flattenAxisView(computeGroupModel(topics)) : []),
    [topics],
  );
  const topicOptions = useMemo(() => (topics ? flattenTopicOptions(topics) : []), [topics]);
  // グループ化済みノードを id で引けるようにし、対立候補の再グループ化を避ける。
  const nodeById = useMemo(() => new Map(flatNodes.map((n) => [n.id, n])), [flatNodes]);
  const currentTopicId = form.topic || topicOptions[0]?.id || "";
  const footerOpposes = useMemo(() => {
    const node = nodeById.get(currentTopicId);
    return node ? opposesOptionsOf(node) : [];
  }, [nodeById, currentTopicId]);

  // ---- トピック（論点ツリー）の更新は discussion.topics を差し替える ----
  function updateTopics(fn: (topics: Topic[]) => Topic[]) {
    setDiscussion((prev) => (prev ? { ...prev, topics: fn(prev.topics) } : prev));
  }

  // ---- 変更ハンドラ（すべて model 経由でイミュータブル更新）----
  const rationaleHandlers: RationaleHandlers = {
    onAddRationale: (sid, text) => updateTopics((t) => addRationale(t, sid, text)),
    onEditRationale: (sid, rid, text) => updateTopics((t) => editRationale(t, sid, rid, text)),
    onDeleteRationale: (sid, rid) => updateTopics((t) => deleteRationale(t, sid, rid)),
  };

  function handleAddStatement(containerId: string, text: string, opposesId: string | null) {
    updateTopics((t) => addStatement(t, containerId, text, opposesId));
  }
  function handleAddSubtopic(containerId: string, name: string) {
    updateTopics((t) => addSubtopic(t, containerId, name));
  }
  function handleAddConflict(statementId: string, text: string) {
    updateTopics((t) => addConflictStatement(t, statementId, text));
  }

  function handleChangeTitle(title: string) {
    setDiscussion((prev) => (prev ? { ...prev, title } : prev));
  }
  function handleAddParticipant(name: string) {
    setDiscussion((prev) =>
      prev ? { ...prev, participants: addParticipant(prev.participants, name) } : prev,
    );
  }
  function handleRemoveParticipant(id: string) {
    setDiscussion((prev) =>
      prev ? { ...prev, participants: removeParticipant(prev.participants, id) } : prev,
    );
  }

  function submitTopic() {
    updateTopics((t) => addTopic(t, topicDraft));
    setTopicDraft("");
    setAddingTopic(false);
  }
  function cancelTopic() {
    setAddingTopic(false);
    setTopicDraft("");
  }

  function addFromFooter() {
    if (!currentTopicId) return;
    updateTopics((t) =>
      addStatement(t, currentTopicId, form.text, form.opposes || null, form.rationale),
    );
    setForm((f) => ({ topic: f.topic, text: "", opposes: "", rationale: "" }));
  }

  const hasTopics = topics !== null && topics.length > 0;

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
        {discussion !== null && (
          <DiscussionHeader
            title={discussion.title}
            participants={discussion.participants}
            onChangeTitle={handleChangeTitle}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={handleRemoveParticipant}
          />
        )}

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
          {discussion === null ? (
            <div style={{ color: "#9b988f", fontSize: 12.5 }}>読み込み中…</div>
          ) : (
            <>
              {!hasTopics && !addingTopic && (
                <div style={{ color: "#9b988f", fontSize: 12.5, lineHeight: 1.6 }}>
                  まだ論点がありません。「＋ 論点を追加」から議論の軸を作りましょう。
                </div>
              )}
              {flatNodes.map((node) => (
                <TopicNode
                  key={node.id}
                  node={node}
                  opposesOptions={opposesOptionsOf(node)}
                  onAddStatement={handleAddStatement}
                  onAddSubtopic={handleAddSubtopic}
                  onAddConflict={handleAddConflict}
                  rationaleHandlers={rationaleHandlers}
                />
              ))}

              {addingTopic ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    aria-label="論点の名前を入力"
                    style={{ ...inlineInputStyle, flex: "none", width: 220 }}
                    placeholder="論点の名前…"
                    value={topicDraft}
                    onChange={(e) => setTopicDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitTopic();
                      if (e.key === "Escape") cancelTopic();
                    }}
                  />
                  <button type="button" style={darkBtnStyle} onClick={submitTopic}>
                    追加
                  </button>
                  <button type="button" style={cancelBtnStyle} onClick={cancelTopic}>
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{ ...linkBtnStyle, fontSize: 11.5, fontWeight: 700 }}
                  onClick={() => setAddingTopic(true)}
                >
                  ＋ 論点を追加
                </button>
              )}
            </>
          )}
        </div>

        {/* フッター（意見の追加フォーム）: 論点が1つ以上あるときのみ表示 */}
        {hasTopics && (
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
