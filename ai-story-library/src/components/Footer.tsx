import ShareButtons from "@/components/ShareButtons";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 mt-24 py-12 bg-black/40 relative z-10">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold tracking-widest mb-2 neon-text">
            AI CONTENT PORTAL <span className="text-lg text-white/70 tracking-normal ml-2">Bubble-Share</span>
          </h2>
          <p className="text-sm text-white/40">読む・聴く・AIと創る。無限に広がるコンテンツライブラリ。</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center text-sm font-bold text-white/60">
          <div className="flex gap-6">
            <a href="/" className="hover:text-accent transition-colors">読む (Read)</a>
            <a href="/listen" className="hover:text-accent transition-colors">聴く (Listen)</a>
            <a href="/post" className="hover:text-accent transition-colors">投稿 (Post)</a>
          </div>
          <div className="flex gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8 text-xs font-normal">
            <a href="/about" className="hover:text-white transition-colors">サイトについて</a>
            <a href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</a>
            <a href="/contact" className="hover:text-white transition-colors">お問い合わせ</a>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <ShareButtons 
          title="AI CONTENT PORTAL - Bubble-Share | 読む・聴く・AIと創る" 
          url="https://www.share-map-bubble.site"
        />
      </div>
      <div className="mt-8 text-center text-xs text-white/30">
        &copy; {new Date().getFullYear()} AI CONTENT PORTAL - Bubble Share運営委員会. All rights reserved.
      </div>
    </footer>
  );
}
