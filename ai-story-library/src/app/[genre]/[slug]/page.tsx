import { getArticleBySlug, getAllArticles } from "@/lib/articles";
import ReactMarkdown from 'react-markdown';
import { notFound } from "next/navigation";
import AudioPlayer from "@/components/AudioPlayer";
import Link from "next/link";
import { Tag, Compass } from "lucide-react";
import fs from "fs";
import path from "path";
import { ArticleCard } from "@/components/ArticleSearchUI";
import Breadcrumb from "@/components/Breadcrumb";
import ArticleStats from "@/components/ArticleStats";
import ArticleComments from "@/components/ArticleComments";
import SpeechReaderUI from "@/components/SpeechReaderUI";
import ShareButtons from "@/components/ShareButtons";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ genre: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { genre, slug } = await params;
  const article = getArticleBySlug(genre, slug);
  
  if (!article) return {};

  const articleUrl = `https://www.share-map-bubble.site/${genre}/${slug}`;

  return {
    title: `${article.title} | Bubble-Share`,
    description: article.description || "Bubble-Shareでこの記事を読もう",
    openGraph: {
      title: article.title,
      description: article.description || "Bubble-Shareでこの記事を読もう",
      url: articleUrl,
      images: [
        {
          url: article.imageUrl || '/og-image.png',
          width: 1200,
          height: 630,
          alt: article.title,
        }
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description || "Bubble-Shareでこの記事を読もう",
      images: [article.imageUrl || '/og-image.png'],
    }
  };
}

export async function generateStaticParams() {
  const genres = ['mystery', 'trip', 'smile'];
  const params: { genre: string; slug: string }[] = [];
  
  for (const genre of genres) {
    const articles = getAllArticles(genre);
    for (const article of articles) {
      params.push({ genre, slug: article.slug });
    }
  }
  
  return params;
}

export default async function ArticlePage({ params }: Props) {
  const { genre, slug } = await params;
  const article = getArticleBySlug(genre, slug);

  if (!article) {
    notFound();
  }

  const allArticles = getAllArticles(genre);
  const decodedSlug = decodeURIComponent(slug);
  const currentIndex = allArticles.findIndex(a => a.slug === decodedSlug || a.slug === slug);
  
  const nextArticle = allArticles[currentIndex + 1] || allArticles[0];
  const nextArticleUrl = nextArticle?.slug !== decodedSlug && nextArticle?.slug !== slug ? `/${genre}/${nextArticle.slug}` : undefined;

  // ジャンルごとのテーマカラー設定
  const themeColors: Record<string, string> = {
    mystery: 'text-accent',
    trip: 'text-blue-400',
    smile: 'text-yellow-400',
    emotion: 'text-pink-400',
    life: 'text-emerald-400',
    knowledge: 'text-purple-400'
  };
  const colorClass = themeColors[genre] || 'text-white';

  // 次におすすめの記事をランダムに6件抽出（現在の記事を除く）
  const recommendedArticles = [...allArticles]
    .filter(a => a.slug !== decodedSlug && a.slug !== slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);

  // BGMファイルのランダム取得
  let bgmUrl: string | undefined;
  try {
    const bgmDir = path.join(process.cwd(), 'public', 'audio', 'bgm', genre);
    if (fs.existsSync(bgmDir)) {
      const files = fs.readdirSync(bgmDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
      if (files.length > 0) {
        const randomBgm = files[Math.floor(Math.random() * files.length)];
        bgmUrl = `/audio/bgm/${genre}/${encodeURIComponent(randomBgm)}`;
      }
    } else {
      const commonDir = path.join(process.cwd(), 'public', 'audio', 'bgm', 'common');
      if (fs.existsSync(commonDir)) {
        const files = fs.readdirSync(commonDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
        if (files.length > 0) {
          const randomBgm = files[Math.floor(Math.random() * files.length)];
          bgmUrl = `/audio/bgm/common/${encodeURIComponent(randomBgm)}`;
        }
      }
    }
  } catch (e) {
    console.error("BGM load error:", e);
  }

  return (
    <>
      {/* ヒーローヘッダー (パララックス背景) */}
      <div className="relative w-full h-[60vh] min-h-[400px] flex items-end mb-12 overflow-hidden">
        {/* 背景画像 (固定配置でパララックス効果を出す) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed scale-105"
          style={{ backgroundImage: `url('${article.imageUrl}')` }}
        ></div>
        
        {/* グラデーションオーバーレイ（下に行くほど暗くなり、テキストを読みやすくする） */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-black/20"></div>

        {/* コンテンツ部分 */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pb-12">
          {/* テキストを読みやすくするためのガラス風パネル（透明度を高め、後ろの画像が見えるように調整） */}
          <div className="bg-black/20 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="mb-6 -mt-2">
              <Breadcrumb items={[
                { name: article.category, href: `/${genre}` },
                { name: article.title }
              ]} />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <span className="bg-black/60 border border-white/20 text-xs px-3 py-1.5 rounded-full text-white font-medium shadow-md">
                {article.category}
              </span>
              <span className="text-sm text-white/90 font-medium">{article.date}</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight text-white [text-shadow:_0_2px_10px_rgba(0,0,0,0.8)]">
              {article.title}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/10">
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <span key={tag} className={`bg-white/10 border border-white/10 ${colorClass} text-xs px-3 py-1 rounded-full flex items-center`}>
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
              
              <ArticleStats slug={decodedSlug} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 z-10 relative">
        <SpeechReaderUI text={article.content} colorClass={colorClass} title={article.title} />
      </div>

      <article className="max-w-3xl mx-auto px-4 pb-32 relative z-10">
        <div className={`prose ${genre === 'mystery' ? 'prose-invert' : ''} prose-lg max-w-none prose-headings:${colorClass} prose-a:${colorClass} hover:prose-a:text-white`}>
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <div className="mt-12 flex justify-end border-t border-white/10 pt-8">
          <ShareButtons title={article.title} description={article.description} />
        </div>
      </article>

      {/* コメントセクション */}
      <ArticleComments slug={article.slug} />

      {/* さらに記事を読むセクション */}
      <div className="w-full max-w-5xl mx-auto px-4 mt-12 mb-40 pt-12 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
          <Compass className="w-6 h-6 text-white/70" />
          <span>次におすすめの記事</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedArticles.map((recArticle) => (
             <ArticleCard key={`rec-${recArticle.slug}`} article={recArticle} />
          ))}
        </div>
      </div>

      <AudioPlayer 
        audioUrl={article.audioUrl} 
        nextArticleUrl={nextArticleUrl} 
        bgmUrl={bgmUrl} 
        title={article.title}
        category={article.category}
        imageUrl={article.imageUrl}
      />
    </>
  );
}
