"use client";

import { useState, useEffect } from "react";
import { Heart, Eye } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ArticleStatsProps {
  slug: string;
}

export default function ArticleStats({ slug }: ArticleStatsProps) {
  const [likes, setLikes] = useState<number>(0);
  const [views, setViews] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ページロード時にアクセス数を+1し、いいね数を取得する
    const fetchAndIncrementStats = async () => {
      if (!slug || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "articles", slug);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // すでにドキュメントが存在する場合は view をインクリメント
          await updateDoc(docRef, { views: increment(1) });
          setViews((data.views || 0) + 1);
          setLikes(data.likes || 0);
        } else {
          // 初回アクセス時はドキュメントを作成
          await setDoc(docRef, { views: 1, likes: 0 });
          setViews(1);
          setLikes(0);
        }

        // 過去に「いいね」を押したかローカルストレージでチェック
        const likedStorage = localStorage.getItem(`liked_${slug}`);
        if (likedStorage === "true") {
          setHasLiked(true);
        }
      } catch (error) {
        console.error("Firestore error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndIncrementStats();
  }, [slug]);

  const handleLike = async () => {
    if (hasLiked || isLoading || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;

    // 即座にUIに反映（オプティミスティックUI）
    setLikes(prev => prev + 1);
    setHasLiked(true);
    localStorage.setItem(`liked_${slug}`, "true");

    try {
      const docRef = doc(db, "articles", slug);
      await updateDoc(docRef, { likes: increment(1) });
    } catch (error) {
      console.error("Error updating likes:", error);
      // 失敗した場合は元に戻す
      setLikes(prev => prev - 1);
      setHasLiked(false);
      localStorage.removeItem(`liked_${slug}`);
    }
  };

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    // Firebase設定がない場合でもUIを壊さないためのフォールバック
    return (
      <div className="flex items-center space-x-6 text-white/50">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5" />
          <span className="font-medium">-</span>
        </div>
        <button className="flex items-center space-x-2 hover:text-white transition-colors">
          <Heart className="w-5 h-5" />
          <span className="font-medium">-</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-6 text-white/70">
      <div className="flex items-center space-x-2" title="再生数（アクセス数）">
        <Eye className="w-5 h-5" />
        <span className="font-medium">{isLoading ? "..." : views}</span>
      </div>
      <button 
        onClick={handleLike}
        disabled={hasLiked || isLoading}
        className={`flex items-center space-x-2 transition-all ${
          hasLiked 
            ? "text-pink-500 scale-110" 
            : "hover:text-pink-400 hover:scale-105"
        }`}
        title={hasLiked ? "いいね済み" : "面白いと思ったらいいね！"}
      >
        <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
        <span className="font-medium">{isLoading ? "..." : likes}</span>
      </button>
    </div>
  );
}
