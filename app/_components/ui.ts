import type { CSSProperties } from "react";

// 議論ボード（2c）で共有する配色とスタイル。デザインのインラインスタイル由来。
export const colors = {
  conflict: "oklch(58% 0.17 25)",
  conflictLink: "oklch(50% 0.16 25)",
  link: "oklch(45% 0.12 265)",
  topicFg: "oklch(35% 0.08 265)",
  saveBg: "oklch(45% 0.10 150)",
  rationaleLabelBg: "oklch(94% 0.02 265)",
  rationaleLabelFg: "oklch(40% 0.08 265)",
  border: "#e5e2da",
  text: "#3a3833",
  muted: "#74716a",
  ink: "#23221f",
} as const;

/** テキストリンク風のボタン（+ 意見を追加 など）。 */
export const linkBtnStyle: CSSProperties = {
  fontSize: 10,
  color: colors.link,
  cursor: "pointer",
  border: "none",
  background: "none",
  padding: 0,
  textAlign: "left",
};

/** 確定（追加）用の濃色ボタン。 */
export const darkBtnStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "5px 10px",
  borderRadius: 5,
  border: "none",
  background: colors.ink,
  color: "#fff",
  cursor: "pointer",
};

/** 取消用のアウトラインボタン。 */
export const cancelBtnStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  padding: "5px 10px",
  borderRadius: 5,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.muted,
  cursor: "pointer",
};

/** 根拠の保存用の緑ボタン（小サイズ）。 */
export const saveBtnStyle: CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 5,
  border: "none",
  background: colors.saveBg,
  color: "#fff",
  cursor: "pointer",
};

/** 小サイズの取消ボタン（根拠編集・対立追加フォーム共用）。 */
export const smallCancelBtnStyle: CSSProperties = {
  ...cancelBtnStyle,
  fontSize: 9.5,
  padding: "3px 8px",
};

/** 小サイズ・赤枠の入力欄（根拠編集・対立追加フォーム共用の基底）。width/flex は呼び出し側で指定。 */
export const smallConflictInputStyle: CSSProperties = {
  fontSize: 10,
  padding: "4px 7px",
  border: `1px solid ${colors.conflict}`,
  borderRadius: 5,
  color: colors.text,
};

/** 小サイズ・赤背景の確定ボタン（対立追加）。 */
export const smallConflictBtnStyle: CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 5,
  border: "none",
  background: colors.conflict,
  color: "#fff",
  cursor: "pointer",
};

/** 対立相手セレクトの見た目（赤系）。 */
export const opposesSelectStyle: CSSProperties = {
  fontSize: 12,
  padding: "7px 9px",
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  color: "oklch(45% 0.12 25)",
  background: "oklch(97% 0.02 25)",
  maxWidth: 190,
};

/** インライン追加フォームの入力欄。 */
export const inlineInputStyle: CSSProperties = {
  flex: 1,
  fontSize: 11,
  padding: "6px 9px",
  border: `1px solid ${colors.link}`,
  borderRadius: 5,
  color: colors.text,
};

/** インライン追加フォームの外枠。 */
export const inlineBoxStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: 8,
};
