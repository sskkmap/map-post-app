import { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { Sparkles, Headphones, PenTool } from "lucide-react";

export const metadata: Metadata = {
  title: "サイトについて",
  description: "AI CONTENT PORTAL - Bubble-Share について。読む・聴く・AIと創る。無限に広がるコンテンツライブラリです。",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pb-32">
      <Breadcrumb items={[{ name: "サイトについて" }]} />
      
      <header className="mb-12 text-center mt-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wider neon-text">
          AI CONTENT PORTAL <span className="text-2xl text-white/70 tracking-normal ml-2">Bubble-Share</span>
        </h1>
        <p className="text-white/60">読む・聴く・AIと創る。無限に広がるコンテンツライブラリ。</p>
      </header>

      <div className="space-y-16 mt-16">
        <section className="glass-panel p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-accent"></div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-accent" />
            AIが毎日生成する無限のストーリー
          </h2>
          <p className="text-white/80 leading-relaxed">
            AI CONTENT PORTAL - Bubble-Share は、最新のAI技術（Google Gemini）を活用して、毎日新しい記事が自動的に生成・追加される次世代のコンテンツライブラリです。
            ミステリー、旅行記、笑える話、ライフハックなど、多様なジャンルの読み物があなたを待っています。
          </p>
        </section>

        <section className="glass-panel p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-400"></div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <Headphones className="w-8 h-8 text-blue-400" />
            「聴く」読書体験
          </h2>
          <p className="text-white/80 leading-relaxed">
            当サイトのすべての記事は、VOICEVOXによる高品質な音声合成エンジンを用いて自動的に音声化されています。
            通勤中や作業中など、画面を見られない時でも、ラジオ感覚で記事を楽しむことができます。プレイリストモードでは連続再生も可能です。
          </p>
        </section>

        <section className="glass-panel p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400"></div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <PenTool className="w-8 h-8 text-yellow-400" />
            あなたもAIと一緒にクリエイターに
          </h2>
          <p className="text-white/80 leading-relaxed">
            ただ読むだけでなく、あなた自身のアイデアや簡単なメモを投稿することで、AIがそれを魅力的な記事に仕上げてくれます。
            マークダウン装飾やカテゴリ分けも全自動。思いついたアイデアを投げるだけで、立派なコンテンツの一部になります。
          </p>
        </section>
      </div>
    </div>
  );
}
