import { Metadata } from "next";

export const metadata: Metadata = {
  title: "投稿する（AIで小話を作成）",
  description: "あなたもAIを使って新しいストーリーや小話を作成し、投稿してみませんか？",
};

export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
