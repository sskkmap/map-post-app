import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutGrid, Headphones, BookOpen, PenTool, Mail } from "lucide-react";
import Link from "next/link";
import { GoogleAnalytics } from '@next/third-parties/google';
import ThemeProvider from "@/components/ThemeProvider";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.share-map-bubble.site"),
  title: {
    template: "%s | AI CONTENT PORTAL - Bubble-Share",
    default: "AI CONTENT PORTAL - Bubble-Share",
  },
  description: "読む・聴く・投稿する・AIと創る。AIコンテンツライブラリ",
  keywords: ["聞き流し", "作業用", "オーディオ", "小話", "AI", "コンテンツ", "Bubble-Share"],
  openGraph: {
    title: "AI CONTENT PORTAL - Bubble-Share",
    description: "読む・聴く・投稿する・AIと創る。AIコンテンツライブラリ",
    url: "https://www.share-map-bubble.site",
    siteName: "Bubble-Share",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI CONTENT PORTAL - Bubble-Share",
    description: "読む・聴く・投稿する・AIと創る。AIコンテンツライブラリ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="portal" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-3015895490418469" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3015895490418469"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-700`}
      >
        <GoogleAnalytics gaId="G-ZJT51D16V3" />
        <ThemeProvider>
          <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/10 theme-nav">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 group">
                <LayoutGrid className="w-5 h-5 theme-text-muted group-hover:text-current transition-all duration-300" />
                <span className="font-bold tracking-widest bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                  Bubble-Share
                </span>
              </Link>
              <div className="flex space-x-6">
                <Link href="/#read-section" className="text-sm flex items-center space-x-1 theme-text-muted hover:text-accent transition-colors">
                  <BookOpen className="w-4 h-4" />
                  <span>読む</span>
                </Link>
                <Link href="/listen" className="text-sm flex items-center space-x-1 theme-text-muted hover:text-accent transition-colors">
                  <Headphones className="w-4 h-4" />
                  <span>聴く</span>
                </Link>
                <Link href="/post" className="text-sm flex items-center space-x-1 theme-text-muted hover:text-accent transition-colors">
                  <PenTool className="w-4 h-4" />
                  <span>投稿</span>
                </Link>
                <Link href="/contact" className="text-sm flex items-center space-x-1 theme-text-muted hover:text-accent transition-colors">
                  <Mail className="w-4 h-4" />
                  <span>お問い合わせ</span>
                </Link>
              </div>
            </div>
          </nav>
          <main className="pt-24 pb-12 min-h-screen">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
