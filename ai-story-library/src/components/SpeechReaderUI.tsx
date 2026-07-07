"use client";

import { useState, useEffect, useRef } from "react";
import { AlignLeft } from "lucide-react";

interface SpeechReaderUIProps {
  text: string;
  colorClass: string;
  title?: string;
}

export default function SpeechReaderUI({ text, colorClass, title = "" }: SpeechReaderUIProps) {
  const [sentenceData, setSentenceData] = useState<{text: string, startChar: number, endChar: number}[]>([]);
  const [totalChars, setTotalChars] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // テキストを文で分割し、各文の文字数を計算して保持する
  useEffect(() => {
    // マークダウンの記号などを簡易的に除去
    const cleanText = text.replace(/[#*`_\[\]()]/g, '');
    // 句点や改行だけでなく、読点（、）でも分割することで1行の長さを一定（短め）に保つ
    const splitRegex = /(?<=[。！？、\n])/;
    const parts = cleanText.split(splitRegex).map(s => s.trim()).filter(s => s.length > 0);
    
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

      // タイトルの長さに応じてオフセット（待機秒数）を動的に計算する
      // 音声生成時には「タイトル。〇〇。」という形式で読まれている
      let OFFSET_SECONDS = 0;
      if (title && duration) {
        const titleText = `タイトル。${title}。`;
        const totalAudioChars = titleText.length + totalChars;
        // （タイトルの文字数 / 全体の文字数） * 全体の秒数
        OFFSET_SECONDS = duration * (titleText.length / totalAudioChars);
      } else {
        OFFSET_SECONDS = 8; // titleがない場合のフォールバック
      }

      let targetCharPosition = 0;

      if (currentTime !== undefined && duration !== undefined) {
        // オフセット未満の場合は、テキストは一番最初（0番目）で待機
        if (currentTime < OFFSET_SECONDS) {
          setCurrentIndex(0);
          return;
        }

        // 8秒以降の残りの時間でパーセンテージを再計算
        const remainingDuration = Math.max(1, duration - OFFSET_SECONDS);
        const adjustedCurrentTime = currentTime - OFFSET_SECONDS;
        const ratio = Math.max(0, Math.min(1, adjustedCurrentTime / remainingDuration));
        targetCharPosition = ratio * totalChars;
      } else {
        // 万が一 currentTime が取れなかった場合のフォールバック（以前のロジック）
        const ratio = Math.max(0, Math.min(1, progress / 100));
        targetCharPosition = ratio * totalChars;
      }
      
      // 目標の文字位置（targetCharPosition）が含まれている文を探す
      let index = sentenceData.findIndex(
        s => targetCharPosition >= s.startChar && targetCharPosition <= s.endChar
      );
      
      // 見つからない場合（100%になりきった時など）は最後の文にする
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
    // 5秒間操作がなければ自動スクロールを再開する
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 5000);
  };

  // currentIndexが変わったらスクロールを調整する
  useEffect(() => {
    // ユーザーが手動でスクロールしている間は自動追従をストップする
    if (scrollRef.current && currentIndex >= 0 && !isUserScrolling) {
      const container = scrollRef.current;
      const activeElement = container.querySelector('[data-active="true"]') as HTMLElement;
      
      if (activeElement) {
        // ページ全体がスクロールされてしまう（scrollIntoView）のを防ぐため、
        // コンテナ内部のスクロール位置（scrollTop）を手動で計算して移動させる
        const containerCenter = container.clientHeight / 2;
        const elementCenter = activeElement.offsetTop + (activeElement.clientHeight / 2);
        
        container.scrollTo({
          top: elementCenter - containerCenter,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, isUserScrolling]);

  return (
    <div className="glass-panel rounded-2xl p-6 mt-12 mb-8 relative overflow-hidden flex flex-col items-center w-full mx-auto shadow-2xl bg-black/40">
      {/* グラデーションオーバーレイで上下を暗くしてフェードアウト効果 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-10"></div>
      
      <div className="w-full flex items-center justify-between mb-4 z-20">
        <div className="flex items-center space-x-2">
          <AlignLeft className={`w-5 h-5 ${colorClass}`} />
          <span className="font-bold text-sm text-white/80">連動テキスト</span>
        </div>
      </div>

      {/* スライダー部分 */}
      <div 
        ref={scrollRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        className="w-full h-48 overflow-y-auto relative z-0 px-4 py-16"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Firefox, IE用にスクロールバー非表示
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {sentenceData.map((data, index) => {
          const isActive = index === currentIndex;
          
          let opacityClass = 'opacity-30';
          let styleClass = 'text-white/50 text-base scale-95';
          
          if (isActive) {
            opacityClass = 'opacity-100';
            // メインカラーで装飾、太字
            styleClass = `font-bold text-xl md:text-2xl scale-100 ${colorClass}`;
          } else if (index === currentIndex - 1 || index === currentIndex + 1) {
            opacityClass = 'opacity-60';
            styleClass = 'text-white/80 text-lg scale-95';
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
}
