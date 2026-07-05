"use client";

import type { CSSProperties } from "react";
import type { OpposesOption } from "@/lib/discussion/model";
import { opposesSelectStyle } from "./ui";

type Props = {
  value: string;
  options: OpposesOption[];
  onChange: (value: string) => void;
  style?: CSSProperties;
  ariaLabel?: string;
};

/** 対立する意見を選ぶセレクト（フッター／インライン追加フォームで共用）。 */
export function OpposesSelect({
  value,
  options,
  onChange,
  style,
  ariaLabel = "対立する意見を選択",
}: Props) {
  return (
    <select
      aria-label={ariaLabel}
      style={{ ...opposesSelectStyle, ...style }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">対立なし</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          ⚡ {o.text}
        </option>
      ))}
    </select>
  );
}
