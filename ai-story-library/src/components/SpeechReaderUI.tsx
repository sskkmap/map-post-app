"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlignLeft, Maximize, Minimize } from "lucide-react";

interface SpeechReaderUIProps {
  text: string;
  colorClass: string;
  title?: string;
}

export default function SpeechReaderUI({ text, colorClass, title = "" }: SpeechReaderUIProps) {
  const [sentenceData, setSentenceData] = useState<{text: string, startChar: number, endChar: number}[]>([]);
  const [totalChars, setTotalChars] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // テキストを文で分割し、各文の文字数を計算して保持する
  useEffect(() => {
    // マークダウンの記号などを簡易的に除去
    const cleanText = text.replace(/[#*`_\[\]()]/g, '');
    // 句点や改行だけでなく、読点（、）でも分割
    const splitRegex = /(?<=[。！？、\n])/;
    const rawParts = cleanText.split(splitRegex).map(s => s.trim()).filter(s => s.length > 0);
    
    // 5文字以下の短い言葉で改行されないように結合するロジック
    const parts: string[] = [];
    let currentBuffer = "";
    
    for (let i = 0; i < rawParts.length; i++) {
      currentBuffer += rawParts[i];
      // 5文字以下で、かつ最後の要素でなければ、次と結合するために溜めておく
      if (currentBuffer.length <= 5 && i < rawParts.length - 1) {
        continue;
      }
      parts.push(currentBuffer);
      currentBuffer = "";
    }
    if (currentBuffer) {
      parts.push(currentBuffer);
    }
    
    let currentTotal = 0;
    const data = parts.map(part => {
      const length = part.length;
      const startChar = currentTotal;
      currentTotal += length; // 次の開始位置
      const endChar = currentTotal;
      return { text: part, startChar, endChar };
    });
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSentenceData(data);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotalChars(currentTotal);
  }, [text]);

  // AudioPlayerからの進捗イベントを受け取る
  useEffect(() => {
    const handleAudioProgress = (e: Event) => {
      const customEvent = e as CustomEvent<{ progress: number, currentTime?: number, duration?: number }>;
      const { progress, currentTime, duration } = customEvent.detail;
      
      if (sentenceData.length === 0 || totalChars === 0) return;

      let OFFSET_SECONDS = 0;
      if (title && duration) {
        const titleText = `タイトル。${title}。`;
        const totalAudioChars = titleText.length + totalChars;
        OFFSET_SECONDS = duration * (titleText.length / totalAudioChars);
      } else {
        OFFSET_SECONDS = 8;
      }

      let targetCharPosition = 0;

      if (currentTime !== undefined && duration !== undefined) {
        if (currentTime < OFFSET_SECONDS) {
          setCurrentIndex(0);
          return;
        }

        const remainingDuration = Math.max(1, duration - OFFSET_SECONDS);
        const adjustedCurrentTime = currentTime - OFFSET_SECONDS;
        const ratio = Math.max(0, Math.min(1, adjustedCurrentTime / remainingDuration));
        targetCharPosition = ratio * totalChars;
      } else {
        const ratio = Math.max(0, Math.min(1, progress / 100));
        targetCharPosition = ratio * totalChars;
      }
      
      let index = sentenceData.findIndex(
        s => targetCharPosition >= s.startChar && targetCharPosition <= s.endChar
      );
      
      if (index === -1) {
        index = sentenceData.length - 1;
      }
      
      setCurrentIndex(index);
    };

    window.addEventListener("audioProgress", handleAudioProgress);

    return () => {
      window.removeEventListener("audioProgress", handleAudioProgress);
    };
  }, [sentenceData, totalChars, title]);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUserScroll = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 5000);
  };

  useEffect(() => {
    if (scrollRef.current && currentIndex >= 0 && !isUserScrolling) {
      const container = scrollRef.current;
      const activeElement = container.querySelector('[data-active="true"]') as HTMLElement;
      
      if (activeElement) {
        const containerCenter = container.clientHeight / 2;
        const elementCenter = activeElement.offsetTop + (activeElement.clientHeight / 2);
        
        container.scrollTo({
          top: elementCenter - containerCenter,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, isUserScrolling, isFullscreen]); // isFullscreen変更時にもスクロール位置を再計算する

  // ESCキーで全画面解除
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 全画面モード時にbodyのスクロールを止める
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden'; // iOS Safari対策
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isFullscreen]);

  const content = (
    <div className={`transition-all duration-500 ease-in-out origin-center ${
      isFullscreen 
        ? "fixed inset-0 z-[9999] bg-[#050505] flex flex-col justify-center py-12 px-4 md:px-12 overscroll-contain" 
        : "glass-panel rounded-2xl p-6 mt-12 mb-8 relative bg-black/40 shadow-2xl"
    } overflow-hidden w-full mx-auto`}>
      
      {/* グラデーションオーバーレイで上下を暗くしてフェードアウト効果 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] pointer-events-none z-10"></div>
      
      {/* 全画面モード専用の目立つ「閉じる」ボタン */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 md:top-8 md:right-8 z-[10000] bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-full flex items-center shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >
          <Minimize className="w-5 h-5 mr-2" />
          <span className="font-bold">閉じる</span>
        </button>
      )}

      <div className={`w-full flex items-center justify-between mb-4 z-20 ${isFullscreen ? "max-w-5xl mx-auto absolute top-6 left-6" : ""}`}>
        <div className="flex items-center space-x-2">
          <AlignLeft className={`w-5 h-5 ${colorClass}`} />
          <span className="font-bold text-sm text-white/80">連動テキスト</span>
        </div>
        {!isFullscreen && (
          <button 
            onClick={() => setIsFullscreen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 flex items-center justify-center bg-black/40 border border-white/10 backdrop-blur-sm shadow-lg"
            title="全画面表示"
          >
            <Maximize className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* スライダー部分 */}
      <div 
        ref={scrollRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        className={`w-full overflow-y-auto relative z-0 px-4 ${isFullscreen ? "h-[70vh] py-[30vh] max-w-5xl mx-auto" : "h-[300px] py-[130px]"}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {sentenceData.map((data, index) => {
          const isActive = index === currentIndex;
          const distance = Math.abs(index - currentIndex);
          
          let opacityClass = 'opacity-20';
          let styleClass = 'text-white/40 text-sm md:text-base scale-90';
          
          if (distance === 0) {
            // 現在の行（中央）
            opacityClass = 'opacity-100';
            styleClass = `font-bold text-xl md:text-3xl scale-100 ${colorClass}`;
          } else if (distance === 1) {
            // 上下1行（中間3行の範囲）
            opacityClass = 'opacity-80';
            styleClass = 'text-white/90 text-lg md:text-2xl scale-95 font-medium';
          } else if (distance === 2) {
            // 上下2行（外側の2行）
            opacityClass = 'opacity-40';
            styleClass = 'text-white/60 text-base md:text-xl scale-95';
          }

          // 全画面用のスケールアップ
          if (isFullscreen) {
            if (distance === 0) styleClass = `font-bold text-3xl md:text-5xl lg:text-6xl scale-100 leading-tight ${colorClass}`;
            else if (distance === 1) styleClass = 'text-white/90 text-2xl md:text-4xl lg:text-5xl scale-95 font-medium leading-relaxed';
            else if (distance === 2) styleClass = 'text-white/60 text-xl md:text-3xl lg:text-4xl scale-95 leading-relaxed';
            else styleClass = 'text-white/40 text-lg md:text-2xl scale-90 leading-relaxed';
          }

          return (
            <div 
              key={index} 
              data-active={isActive}
              className={`text-center py-4 transition-all duration-500 ease-out origin-center ${opacityClass} ${styleClass} [text-shadow:_0_2px_10px_rgba(0,0,0,0.5)]`}
            >
              {data.text}
            </div>
          );
        })}
        {sentenceData.length === 0 && (
          <div className="text-center text-white/50">読み込み中...</div>
        )}
      </div>
    </div>
  );

  if (isFullscreen && mounted) {
    return (
      <>
        {/* 全画面モードになった時に、元の位置のレイアウトが崩れないようにプレースホルダーを置く */}
        <div className="h-[300px] w-full mt-12 mb-8 hidden md:block"></div>
        {createPortal(content, document.body)}
      </>
    );
  }

  return content;
}
