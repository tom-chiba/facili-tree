import { ConflictBoard } from "@/app/_components/ConflictBoard";

// Server Component のまま UI 本体（Client Component）を描画する。
// metadata は layout.tsx で定義している。
export default function Home() {
  return <ConflictBoard />;
}
