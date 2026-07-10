import Link from "next/link";
import { Ghost, Map, Smile, Heart, Compass, Lightbulb, BookOpen, Flame } from "lucide-react";
import { ArticleCard } from "@/components/ArticleSearchUI"; // We will extract ArticleCard to reuse it
import { getAllArticlesGlobal } from "@/lib/articles";
import ArticleSearchUI from "@/components/ArticleSearchUI";
import RankingSection from "@/components/RankingSection";

export default function PortalPage() {
  const allArticles = getAllArticlesGlobal();
  const totalCount = allArticles.length;
  
  // カテゴリ数
  const categories = new Set(allArticles.map(a => a.category).filter(Boolean));
  const categoryCount = categories.size;

  // 推定総再生時間 (1分間に約450文字VOICEVOXスピード換算)
  const totalChars = allArticles.reduce((sum, a) => sum + (a.content ? a.content.length : 0), 0);
  const totalMinutes = Math.round(totalChars / 450);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="max-w-5xl mx-auto px-4 flex flex-col items-center justify-center min-h-[70vh]">
      <header className="mb-8 text-center w-full">
        <h1 className="text-5xl md:text-7xl font-bold tracking-widest mb-6 leading-tight">
          <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">AI CONTENT</span>
          <span className="text-white/50 bg-gradient-to-r from-pink-500 to-accent bg-clip-text text-transparent"> PORTAL</span><br />
          <span className="text-xl md:text-3xl bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent tracking-normal">Bubble-Share</span>
        </h1>
        <p className="text-xl text-white/60 mb-6">読む・聴く・AIと創る。無限に広がるコンテンツライブラリ。</p>

        {/* 動的統計ダッシュボード */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 z-10 relative">
          <div className="glass-panel px-6 py-3 rounded-full border border-white/5 flex items-center space-x-3 shadow-lg">
            <BookOpen className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-white/80 font-bold text-sm">公開記事: <span className="text-accent text-base ml-1 font-mono">{totalCount}</span> 本</span>
          </div>
          <div className="glass-panel px-6 py-3 rounded-full border border-white/5 flex items-center space-x-3 shadow-lg">
            <Compass className="w-5 h-5 text-blue-400" />
            <span className="text-white/80 font-bold text-sm">カテゴリ: <span className="text-blue-400 text-base ml-1 font-mono">{categoryCount}</span> 種類</span>
          </div>
          <div className="glass-panel px-6 py-3 rounded-full border border-white/5 flex items-center space-x-3 shadow-lg">
            <Flame className="w-5 h-5 text-pink-400 animate-bounce" />
            <span className="text-white/80 font-bold text-sm">総再生時間: <span className="text-pink-400 text-base ml-1 font-mono">{totalHours}</span> 時間</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-8">
        {/* ミステリー */}
        <Link href="/mystery" className="group block">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 group-hover:border-[#00ff66]/50 transition-all duration-500 transform group-hover:-translate-y-2 text-center relative overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-[#00ff66]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Ghost className="w-16 h-16 mx-auto mb-6 text-white/40 group-hover:text-[#00ff66] transition-colors duration-300" />
            <h2 className="text-2xl font-bold mb-3 group-hover:neon-text transition-all">MYSTERY</h2>
            <p className="text-sm text-white/50">都市伝説・怪談・超常現象</p>
          </div>
        </Link>

        {/* 旅行 */}
        <Link href="/trip" className="group block">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 group-hover:border-blue-400/50 transition-all duration-500 transform group-hover:-translate-y-2 text-center relative overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Map className="w-16 h-16 mx-auto mb-6 text-white/40 group-hover:text-blue-400 transition-colors duration-300" />
            <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors">TRIP</h2>
            <p className="text-sm text-white/50">絶景スポット・名所巡り・旅行記</p>
          </div>
        </Link>

        {/* スマイル */}
        <Link href="/smile" className="group block">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 group-hover:border-yellow-400/50 transition-all duration-500 transform group-hover:-translate-y-2 text-center relative overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Smile className="w-16 h-16 mx-auto mb-6 text-white/40 group-hover:text-yellow-400 transition-colors duration-300" />
            <h2 className="text-2xl font-bold mb-3 group-hover:text-yellow-400 transition-colors">SMILE</h2>
            <p className="text-sm text-white/50">お笑い・日常・ほっこりエピソード</p>
          </div>
        </Link>

        {/* 感動 */}
        <Link href="/emotion" className="group block">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 group-hover:border-pink-400/50 transition-all duration-500 transform group-hover:-translate-y-2 text-center relative overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-pink-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Heart className="w-16 h-16 mx-auto mb-6 text-white/40 group-hover:text-pink-400 transition-colors duration-300" />
            <h2 className="text-2xl font-bold mb-3 group-hover:text-pink-400 transition-colors">EMOTION</h2>
            <p className="text-sm text-white/50">感動する話・恋愛・家族愛・友情</p>
          </div>
        </Link>

        {/* 人生・仕事 */}
        <Link href="/life" className="group block">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 group-hover:border-emerald-400/50 transition-all duration-500 transform group-hover:-translate-y-2 text-center relative overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Compass className="w-16 h-16 mx-auto mb-6 text-white/40 group-hover:text-emerald-400 transition-colors duration-300" />
            <h2 className="text-2xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">LIFE</h2>
            <p className="text-sm text-white/50">人生論・ビジネス・自己成長・挑戦</p>
          </div>
        </Link>

        {/* 雑学・歴史 */}
        <Link href="/knowledge" className="group block">
          <div className="glass-panel p-8 rounded-2xl border border-white/5 group-hover:border-purple-400/50 transition-all duration-500 transform group-hover:-translate-y-2 text-center relative overflow-hidden h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Lightbulb className="w-16 h-16 mx-auto mb-6 text-white/40 group-hover:text-purple-400 transition-colors duration-300" />
            <h2 className="text-2xl font-bold mb-3 group-hover:text-purple-400 transition-colors">KNOWLEDGE</h2>
            <p className="text-sm text-white/50">宇宙・歴史・科学・雑学・スポーツ</p>
          </div>
        </Link>
      </div>

      <div id="read-section" className="w-full max-w-4xl mt-24 pt-12 border-t border-white/10">
        <h2 className="text-3xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
          <BookOpen className="w-8 h-8 text-accent" />
          <span>すべての記事を読む</span>
        </h2>
        {/* 全体検索・カテゴリフィルターUI（未検索時はランダム18件） */}
        <ArticleSearchUI articles={allArticles} isGlobal={true} />
      </div>

      {/* 人気の記事セクション（動的ランキング） */}
      <RankingSection articles={allArticles} />
    </div>
  );
}
