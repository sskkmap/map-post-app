"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, PlayCircle, Clock, Tag, X, Eye } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ArticleData } from "@/lib/articles";
import KANA_MAP_DATA from "@/lib/kana_map.json";

interface ArticleSearchUIProps {
  articles: ArticleData[];
  isGlobal?: boolean;
}

export default function ArticleSearchUI({ articles, isGlobal = false }: ArticleSearchUIProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(9); // 初期表示件数を9件に設定
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // マウント検知
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 検索条件が変わった時に人工的な遅延（期待感）を持たせてリセット
  useEffect(() => {
    setIsSearching(true);
    setDisplayLimit(9);
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, 800); // 0.8秒のローディング
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 9);
      setIsLoadingMore(false);
    }, 800); // 0.8秒のローディング
  };

  // 存在するすべてのカテゴリを動的に抽出
  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(a => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats).sort();
  }, [articles]);

  const VISIBLE_CATEGORIES = 15;
  const visibleCategories = isCategoryExpanded ? categories : categories.slice(0, VISIBLE_CATEGORIES);
  const hasMoreCategories = categories.length > VISIBLE_CATEGORIES;

  // カタカナをひらがなに変換する関数
  const toHiragana = (str: string) => {
    return str.replace(/[\u30a1-\u30f6]/g, match =>
      String.fromCharCode(match.charCodeAt(0) - 0x60)
    );
  };

  const KANA_MAP = KANA_MAP_DATA as Record<string, string[]>;

  // 検索クエリに基づいてサジェスト候補（カテゴリ・タグ）を抽出（前方一致・ひらがな対応）
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    // 入力を小文字＆ひらがなに統一
    const normalizedQuery = toHiragana(searchQuery.toLowerCase());
    
    const keywords = new Set<string>();
    
    const checkMatch = (word: string) => {
      // 1. 元の文字列で前方一致
      if (word.toLowerCase().startsWith(normalizedQuery)) return true;
      // 2. 辞書にひらがな読みがあれば、それで前方一致
      const readings = KANA_MAP[word];
      if (readings && readings.some(r => r.startsWith(normalizedQuery))) return true;
      return false;
    };

    articles.forEach(article => {
      if (article.category && checkMatch(article.category)) {
        keywords.add(article.category);
      }
      article.tags.forEach(tag => {
        if (checkMatch(tag)) {
          keywords.add(tag);
        }
      });
    });
    return Array.from(keywords).slice(0, 5); // 最大5件
  }, [articles, searchQuery]);

  // 検索クエリとカテゴリで絞り込み
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      if (searchQuery === "" && selectedCategory === null) return true;

      // キーワード検索（大文字小文字を区別せず、# も無視する）
      const query = searchQuery.toLowerCase().replace(/#/g, '');

      const matchesSearch = searchQuery === "" || 
        (article.title && article.title.toLowerCase().includes(query)) ||
        (article.description && article.description.toLowerCase().includes(query)) ||
        (article.category && article.category.toLowerCase().includes(query)) ||
        (article.content && article.content.toLowerCase().includes(query)) ||
        (article.tags && article.tags.some(tag => tag.toLowerCase().replace(/#/g, '').includes(query)));
      
      const matchesCategory = selectedCategory === null || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 検索・絞り込みエリア */}
      <div className="w-full max-w-3xl mb-12 space-y-6">
        {/* 検索窓 */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-white/40" />
          </div>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            placeholder={isGlobal ? "すべての記事から検索..." : "このジャンルから検索..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* サジェスト表示 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-2 bg-black/90 border border-white/20 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
              <ul className="py-2">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-6 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center"
                    >
                      <Tag className="w-4 h-4 mr-3 opacity-50" />
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* カテゴリボタン群 */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center transition-all">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === null 
                  ? "bg-white text-black" 
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              すべて
            </button>
            {visibleCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-white text-black" 
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
            {hasMoreCategories && (
              <button
                onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                className="px-4 py-2 rounded-full text-sm font-medium bg-black/30 text-white/40 hover:text-white/80 border border-white/5 transition-all"
              >
                {isCategoryExpanded ? "閉じる" : `+ ${categories.length - VISIBLE_CATEGORIES} 件をもっと見る`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 記事一覧表示 */}
      <div className="w-full max-w-5xl">
        {isGlobal && (searchQuery !== "" || selectedCategory !== null) && (
            <div className="mb-6 text-white/60 text-sm">
              検索結果: {filteredArticles.length} 件
            </div>
          )}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-20 text-white/40 bg-white/5 rounded-xl border border-white/10">
              見つかりませんでした。別のキーワードやカテゴリをお試しください。
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-8 w-full">
              {/* マウント前または検索中はスケルトンを表示 */}
              {!isMounted || isSearching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="glass-panel rounded-xl p-6 min-h-[220px] border border-white/5 animate-pulse flex flex-col">
                      <div className="w-16 h-5 bg-white/10 rounded mb-4"></div>
                      <div className="w-full h-6 bg-white/10 rounded mb-2"></div>
                      <div className="w-3/4 h-6 bg-white/10 rounded mb-6"></div>
                      <div className="w-full h-16 bg-white/5 rounded mt-auto"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {filteredArticles.slice(0, displayLimit).map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                  
                  {/* 「さらに読み込む」中のスケルトン表示 */}
                  {isLoadingMore && [...Array(3)].map((_, i) => (
                    <div key={`loading-${i}`} className="glass-panel rounded-xl p-6 min-h-[220px] border border-white/5 animate-pulse flex flex-col">
                      <div className="w-16 h-5 bg-white/10 rounded mb-4"></div>
                      <div className="w-full h-6 bg-white/10 rounded mb-2"></div>
                      <div className="w-3/4 h-6 bg-white/10 rounded mb-6"></div>
                      <div className="w-full h-16 bg-white/5 rounded mt-auto"></div>
                    </div>
                  ))}
                </div>
              )}
              
              {isMounted && !isSearching && filteredArticles.length > displayLimit && !isLoadingMore && (
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition-all font-medium"
                >
                  さらに読み込む
                </button>
              )}
            </div>
          )}
        </div>
    </div>
  );
}

export function ArticleCard({ article }: { article: ArticleData }) {
  // ジャンルごとのテーマカラー
  const genreColors: Record<string, string> = {
    mystery: 'text-[#00ff66]',
    trip: 'text-blue-400',
    smile: 'text-yellow-400',
    emotion: 'text-pink-400',
    life: 'text-emerald-400',
    knowledge: 'text-purple-400'
  };
  const colorClass = genreColors[article.genre] || 'text-white';

  return (
    <Link href={`/${article.genre}/${article.slug}`} className="group h-full flex flex-col">
      <article className="glass-panel rounded-xl h-full border border-white/5 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col">
        <div className={`absolute top-0 left-0 w-1 h-full bg-current opacity-0 group-hover:opacity-100 transition-opacity z-10 ${colorClass}`}></div>
        
        {/* アイキャッチ画像部分（ホバーでズーム） */}
        <div className="w-full h-48 relative overflow-hidden bg-black/50">
          {article.imageUrl && (
            <img 
              src={article.imageUrl} 
              alt={article.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {/* 画像上のオーバーレイ（少し暗くしてリッチにする） */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
          
          {/* カテゴリバッジ */}
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-black/60 backdrop-blur-md text-xs px-3 py-1.5 rounded-full text-white/90 border border-white/10 shadow-lg">
              {article.category}
            </span>
          </div>
        </div>
        
        <div className="p-6 flex flex-col flex-grow relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3 text-xs text-white/40">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {article.date}
              </span>
            </div>
          </div>
          
          <h2 className={`text-xl font-bold mb-3 group-hover:${colorClass} transition-colors line-clamp-2 leading-snug`}>
            {article.title}
          </h2>
          
          <p className="text-sm text-white/60 mb-6 line-clamp-3">
            {article.description}
          </p>

          <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex flex-wrap gap-2">
              {article.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] text-white/40 flex items-center bg-white/5 px-2 py-1 rounded-md">
                  <Tag className="w-3 h-3 mr-1" /> {tag}
                </span>
              ))}
            </div>
            <button className={`text-white/40 group-hover:${colorClass} transition-colors transform group-hover:scale-110 duration-300`}>
              <PlayCircle className="w-8 h-8" />
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}
