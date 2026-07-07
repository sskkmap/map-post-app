import { getAllArticlesGlobal } from "@/lib/articles";
import PodcastPlayer from "@/components/PodcastPlayer";
import { Headphones } from "lucide-react";
import bgmMapData from "@/data/bgmMap.json";

export default function ListenPage() {
  const articles = getAllArticlesGlobal();

  const bgmMap: Record<string, string[]> = bgmMapData;

  return (
    <div className="max-w-5xl mx-auto px-4 min-h-[70vh] flex flex-col items-center justify-center">
      <header className="mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-widest mb-4 flex items-center justify-center space-x-4">
          <Headphones className="w-10 h-10 text-accent" />
          <span className="neon-text">LISTEN MODE</span>
        </h1>
        <p className="text-white/60">
          作業用BGMとして、すべての記事を連続再生でお楽しみいただけます。
        </p>
      </header>

      {articles.length > 0 ? (
        <PodcastPlayer articles={articles} bgmMap={bgmMap} />
      ) : (
        <p className="text-white/50">再生できる記事がありません。</p>
      )}
    </div>
  );
}
