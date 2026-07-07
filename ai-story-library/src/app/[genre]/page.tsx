import { getAllArticles } from "@/lib/articles";
import ArticleSearchUI, { ArticleCard } from "@/components/ArticleSearchUI";
import Breadcrumb from "@/components/Breadcrumb";
import { Flame } from "lucide-react";

interface Props {
  params: Promise<{ genre: string }>;
}

export async function generateStaticParams() {
  const genres = ['mystery', 'trip', 'smile', 'emotion', 'life', 'knowledge'];
  return genres.map((genre) => ({ genre }));
}

export default async function GenrePage({ params }: Props) {
  const { genre } = await params;
  const articles = getAllArticles(genre);

  // 人気の記事を抽出（疑似的にランダムまたは逆順で6件）
  const popularArticles = [...articles].reverse().slice(0, 6);

  const genreInfo: Record<string, { title: string; desc: string; color: string; neon: string }> = {
    mystery: { title: '未解決の謎', desc: '都市伝説・怪談・超常現象', color: 'text-accent', neon: 'neon-text' },
    trip: { title: '絶景の旅', desc: '旅行・カフェ・癒やしスポット', color: 'text-blue-400', neon: 'neon-text' },
    smile: { title: '笑顔の日常', desc: 'お笑い・ペット・ほっこり話', color: 'text-yellow-400', neon: 'neon-text' },
    emotion: { title: '心の揺れ', desc: 'エッセイ・ポエム・思索', color: 'text-pink-400', neon: 'neon-text' },
    life: { title: 'ライフハック', desc: '暮らし・仕事・生産性', color: 'text-emerald-400', neon: 'neon-text' },
    knowledge: { title: '知の探求', desc: '科学・歴史・雑学', color: 'text-purple-400', neon: 'neon-text' }
  };

  const info = genreInfo[genre] || { title: 'ライブラリ', desc: 'AIコンテンツ', color: 'text-white', neon: '' };

  return (
    <div className="max-w-5xl mx-auto px-4 flex flex-col items-center">
      <div className="w-full">
        <Breadcrumb items={[
          { name: info.title }
        ]} />
      </div>

      <header className="mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-widest mb-4">
          <span className={info.neon}>{info.title}</span>へようこそ
        </h1>
        <p className="text-white/60 mb-8">{info.desc}のAI生成ライブラリ</p>
      </header>

      {/* ジャンル別の検索・カテゴリフィルター・一覧 */}
      <ArticleSearchUI articles={articles} isGlobal={false} />

      {/* 人気の記事セクション */}
      <div className="w-full mt-24 pt-12 border-t border-white/10 pb-12">
        <h2 className="text-3xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
          <Flame className="w-8 h-8 text-orange-500" />
          <span className="text-orange-500 text-shadow-sm">{info.title}の人気記事 (Trending)</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularArticles.map((article) => (
             <ArticleCard key={`pop-${article.slug}`} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}
