import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "議論マップ — 対立ボード",
  description: "意見同士の対立を可視化して議論を整理するボード（ブラウザ完結）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
