"use client";

import { useState } from "react";
import { PenTool, CheckCircle, Loader2, Wand2, FileText } from "lucide-react";

const GENRE_OPTIONS = [
  { id: "mystery", name: "ミステリー" },
  { id: "trip", name: "旅行記" },
  { id: "smile", name: "笑える話" },
  { id: "emotion", name: "感動する話" },
  { id: "life", name: "人生・仕事" },
  { id: "knowledge", name: "雑学・歴史" }
];

export default function PostPage() {
  const [activeTab, setActiveTab] = useState<"ai" | "free">("ai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  // AI依頼用フォーム
  const [aiData, setAiData] = useState({
    genre: "mystery",
    title: "",
    description: ""
  });

  // 自由投稿用フォーム
  const [freeData, setFreeData] = useState({
    genre: "mystery",
    title: "",
    content: ""
  });

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setIsSuccess(true);
      setAiData({ ...aiData, title: "", description: "" });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "投稿に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
      setIsOnCooldown(true);
      setTimeout(() => setIsOnCooldown(false), 60000); // 1分間のクールダウン
    }
  };

  const handleFreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(freeData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish");
      setIsSuccess(true);
      setFreeData({ ...freeData, title: "", content: "" });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "公開に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
      setIsOnCooldown(true);
      setTimeout(() => setIsOnCooldown(false), 60000); // 1分間のクールダウン
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 min-h-[70vh] flex flex-col items-center justify-center pt-12">
      <header className="mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-widest mb-4 flex items-center justify-center space-x-4">
          <PenTool className="w-10 h-10 text-accent" />
          <span className="neon-text">POST</span>
        </h1>
        <p className="text-white/60">
          記事のお題をAIに依頼するか、自分で書いた文章を直接公開できます。
        </p>
      </header>

      {/* タブ切り替え */}
      <div className="flex w-full mb-8 bg-black/40 rounded-full p-1 border border-white/10 relative z-10">
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-3 px-6 rounded-full font-bold text-sm transition-all flex items-center justify-center space-x-2 ${activeTab === "ai" ? "bg-accent text-black shadow-lg" : "text-white/50 hover:text-white"
            }`}
        >
          <Wand2 className="w-4 h-4" />
          <span>AIに依頼する</span>
        </button>
        <button
          onClick={() => setActiveTab("free")}
          className={`flex-1 py-3 px-6 rounded-full font-bold text-sm transition-all flex items-center justify-center space-x-2 ${activeTab === "free" ? "bg-accent text-black shadow-lg" : "text-white/50 hover:text-white"
            }`}
        >
          <FileText className="w-4 h-4" />
          <span>自由に文章を投稿</span>
        </button>
      </div>

      <div className="glass-panel p-8 rounded-3xl w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-50 pointer-events-none"></div>

        {isSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center space-x-3 text-emerald-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <p>
              {activeTab === "ai"
                ? "リクエストを送信しました！次回の生成をお楽しみに。"
                : "記事を公開しました！音声は数分後に自動で生成・付与されます。"}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center space-x-3 text-red-400">
            <p>{errorMessage}</p>
          </div>
        )}

        {/* AI依頼フォーム */}
        {activeTab === "ai" && (
          <form onSubmit={handleAiSubmit} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">ジャンル</label>
              <select
                value={aiData.genre}
                onChange={(e) => setAiData({ ...aiData, genre: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors appearance-none"
                required
              >
                {GENRE_OPTIONS.map(g => (
                  <option key={g.id} value={g.id} className="bg-neutral-900">{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">タイトル案</label>
              <input
                type="text"
                value={aiData.title}
                onChange={(e) => setAiData({ ...aiData, title: e.target.value })}
                placeholder="例: 絶対に笑ってはいけない社内プレゼンの悲劇"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors placeholder:text-white/20"
                required
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">あらすじ・キーワード（任意）</label>
              <textarea
                value={aiData.description}
                onChange={(e) => setAiData({ ...aiData, description: e.target.value })}
                placeholder="例: プロジェクターに間違えてペットの猫の変顔写真が映し出されてしまい..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors min-h-[120px] placeholder:text-white/20"
                maxLength={200}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isOnCooldown}
              className="w-full bg-accent text-black font-bold py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.3)] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
            >
              {isOnCooldown ? (
                <>
                  <Wand2 className="w-5 h-5 animate-pulse" />
                  <span>AIがせっせと働いています🐾 少々お待ちください！</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>お題をリクエストする</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 自由投稿フォーム */}
        {activeTab === "free" && (
          <form onSubmit={handleFreeSubmit} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">ジャンル</label>
              <select
                value={freeData.genre}
                onChange={(e) => setFreeData({ ...freeData, genre: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors appearance-none"
                required
              >
                {GENRE_OPTIONS.map(g => (
                  <option key={g.id} value={g.id} className="bg-neutral-900">{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">記事のタイトル</label>
              <input
                type="text"
                value={freeData.title}
                onChange={(e) => setFreeData({ ...freeData, title: e.target.value })}
                placeholder="タイトルを入力"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors placeholder:text-white/20"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/70 mb-2">本文（最低100文字・AIが装飾を行い公開されます）</label>
              <textarea
                value={freeData.content}
                onChange={(e) => setFreeData({ ...freeData, content: e.target.value })}
                placeholder="ここに文章を入力してください。改行もそのまま反映されます。"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors min-h-[300px] placeholder:text-white/20"
                required
                minLength={100}
              />
              <p className={`text-xs mt-2 text-right ${freeData.content.length < 100 ? 'text-red-400' : 'text-white/50'}`}>
                {freeData.content.length} / 100 文字 (最小)
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isOnCooldown}
              className="w-full bg-accent text-black font-bold py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.3)] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
            >
              {isOnCooldown ? (
                <>
                  <Wand2 className="w-5 h-5 animate-pulse" />
                  <span>AIがせっせと働いています🐾 少々お待ちください！</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AIが文章を推敲・公開中...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>投稿する</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
