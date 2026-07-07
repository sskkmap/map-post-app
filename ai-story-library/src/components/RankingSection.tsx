"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArticleCard } from "@/components/ArticleSearchUI";
import { ArticleData } from "@/lib/articles";
import { Flame } from "lucide-react";

interface RankingSectionProps {
  articles: ArticleData[];
}

export default function RankingSection({ articles }: RankingSectionProps) {
  const [rankedArticles, setRankedArticles] = useState<ArticleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        // Firebase未設定の場合はモック表示
        setRankedArticles([...articles].reverse().slice(0, 6));
        setIsLoading(false);
        return;
      }

      try {
        const querySnapshot = await getDocs(collection(db, "articles"));
        const statsMap = new Map<string, { views: number; likes: number }>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          statsMap.set(doc.id, {
            views: data.views || 0,
            likes: data.likes || 0
          });
        });

        // 記事データに統計情報を結合
        const enrichedArticles = articles.map(article => ({
          ...article,
          views: statsMap.get(article.slug)?.views || 0,
          likes: statsMap.get(article.slug)?.likes || 0
        }));

        // 再生数（views）を最優先で降順ソート。同数の場合はいいね数（likes）でソート
        enrichedArticles.sort((a, b) => {
          if (b.views !== a.views) {
            return b.views - a.views;
          }
          return b.likes - a.likes;
        });

        setRankedArticles(enrichedArticles.slice(0, 6));
      } catch (error) {
        console.error("Failed to fetch ranking data:", error);
        // フォールバック
        setRankedArticles([...articles].reverse().slice(0, 6));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, [articles]);

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mt-24 pt-12 border-t border-white/10">
        <h2 className="text-3xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
          <Flame className="w-8 h-8 text-orange-500" />
          <span className="text-orange-500 text-shadow-sm">人気の記事 (Trending)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-6 min-h-[220px] border border-white/5 animate-pulse flex flex-col">
              <div className="w-16 h-5 bg-white/10 rounded mb-4"></div>
              <div className="w-full h-6 bg-white/10 rounded mb-2"></div>
              <div className="w-3/4 h-6 bg-white/10 rounded mb-6"></div>
              <div className="w-full h-16 bg-white/5 rounded mt-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mt-24 pt-12 border-t border-white/10">
      <h2 className="text-3xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
        <Flame className="w-8 h-8 text-orange-500" />
        <span className="text-orange-500 text-shadow-sm">人気の記事 (Trending)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rankedArticles.map((article) => (
          <ArticleCard key={`pop-${article.slug}`} article={article} />
        ))}
      </div>
    </div>
  );
}
