"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ListMusic, RotateCcw, RotateCw, ExternalLink, Music } from "lucide-react";
import { ArticleData } from "@/lib/articles";
import Link from "next/link";
import SpeechReaderUI from "@/components/SpeechReaderUI";

const GENRES = [
  { id: "all", name: "すべて" },
  { id: "mystery", name: "ミステリー" },
  { id: "trip", name: "旅行記" },
  { id: "smile", name: "笑える話" },
  { id: "emotion", name: "感動する話" },
  { id: "life", name: "人生・仕事" },
  { id: "knowledge", name: "雑学・歴史" }
];

export default function PodcastPlayer({ articles, bgmMap }: { articles: ArticleData[], bgmMap?: Record<string, string[]> }) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["all"]);
  const [shuffledArticles, setShuffledArticles] = useState<ArticleData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.15);
  const [showBgmSlider, setShowBgmSlider] = useState(false);
  const [currentBgmUrl, setCurrentBgmUrl] = useState<string | undefined>();
  
  const RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // ジャンルのトグル処理
  const toggleGenre = (genreId: string) => {
    if (genreId === "all") {
      setSelectedGenres(["all"]);
      return;
    }

    setSelectedGenres(prev => {
      // "all"が選択されている状態から他のジャンルを選んだ場合
      let next = prev.filter(g => g !== "all");
      
      if (next.includes(genreId)) {
        next = next.filter(g => g !== genreId);
      } else {
        next.push(genreId);
      }

      // 何も選択されていなければ"all"に戻す
      if (next.length === 0) return ["all"];
      return next;
    });
  };

  useEffect(() => {
    // コンポーネントマウント時（ページを開いた時）にプレイリストをシャッフルする
    const shuffled = [...articles].sort(() => 0.5 - Math.random());
    setShuffledArticles(shuffled);
  }, [articles]);

  // ジャンルでフィルタリングされた記事リスト
  const filteredArticles = useMemo(() => {
    // まだシャッフルが終わっていない初期レンダー時は空配列（または元の配列）を返す
    const targetArticles = shuffledArticles.length > 0 ? shuffledArticles : articles;
    
    if (selectedGenres.includes("all")) return targetArticles;
    return targetArticles.filter(a => selectedGenres.includes(a.genre));
  }, [shuffledArticles, articles, selectedGenres]);

  // ジャンル変更時にインデックスをリセット
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [selectedGenres]);

  const currentArticle = filteredArticles[currentIndex];

  useEffect(() => {
    if (!currentArticle || !bgmMap) return;
    let bgmList = bgmMap[currentArticle.genre] || [];
    if (bgmList.length === 0) bgmList = bgmMap["common"] || [];
    if (bgmList.length > 0) {
      setCurrentBgmUrl(bgmList[Math.floor(Math.random() * bgmList.length)]);
    } else {
      setCurrentBgmUrl(undefined);
    }
  }, [currentArticle, bgmMap]);

  useEffect(() => {
    if (!currentArticle) return;

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentArticle.title,
        artist: currentArticle.category,
        album: "AI CONTENT PORTAL - Bubble-Share",
        artwork: [
          { src: currentArticle.imageUrl || "/favicon.ico", sizes: "512x512", type: "image/png" }
        ]
      });

      navigator.mediaSession.setActionHandler("play", () => togglePlay(true));
      navigator.mediaSession.setActionHandler("pause", () => togglePlay(false));
      navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
      navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
    }
  }, [currentArticle]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (bgmRef.current) {
      bgmRef.current.volume = (isMuted || bgmVolume === 0) ? 0 : (bgmVolume * 0.2);
    }
  }, [volume, bgmVolume, isMuted]);

  useEffect(() => {
    const savedRate = localStorage.getItem("playbackRate");
    if (savedRate) {
      setPlaybackRate(parseFloat(savedRate));
    }
    
    const savedBgmVol = localStorage.getItem("bgmVolume");
    if (savedBgmVol !== null) setBgmVolume(parseFloat(savedBgmVol));
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentArticle]);

  useEffect(() => {
    if (isPlaying && audioRef.current && currentArticle) {
      audioRef.current.play().catch(() => setIsPlaying(false));
      if (bgmVolume > 0 && bgmRef.current) bgmRef.current.play().catch(e => console.error(e));
    }
  }, [currentIndex, currentArticle]); // 曲が変わったら自動再生

  useEffect(() => {
    if (isPlaying && currentArticle && bgmVolume > 0 && bgmRef.current) {
      bgmRef.current.play().catch(e => console.error(e));
    } else if (bgmRef.current) {
      bgmRef.current.pause();
    }
  }, [isPlaying, bgmVolume]);

  const togglePlay = (forceState?: boolean) => {
    if (!audioRef.current || !currentArticle) return;
    const nextState = forceState !== undefined ? forceState : !isPlaying;
    if (nextState) {
      audioRef.current.play();
      if (bgmVolume > 0 && bgmRef.current) bgmRef.current.play().catch(e => console.error(e));
    } else {
      audioRef.current.pause();
      if (bgmRef.current) bgmRef.current.pause();
    }
    setIsPlaying(nextState);
  };

  const playNext = () => {
    if (currentIndex < filteredArticles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };

  const skip = (amount: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + amount, duration));
    }
  };

  const togglePlaybackRate = () => {
    const nextIndex = (RATES.indexOf(playbackRate) + 1) % RATES.length;
    const nextRate = RATES[nextIndex];
    setPlaybackRate(nextRate);
    localStorage.setItem("playbackRate", nextRate.toString());
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setProgress(currentTime);
      setDuration(duration);
      
      const currentProgress = (currentTime / duration) * 100;
      window.dispatchEvent(new CustomEvent("audioProgress", { detail: { progress: currentProgress, currentTime, duration } }));
    }
  };

  const handleEnded = () => {
    playNext();
  };

  const handleError = () => {
    console.warn("音声データが見つからないか、再生に失敗しました。次の記事にスキップします。");
    // 無限ループでブラウザが固まるのを防ぐため少しだけ待機して次へ
    setTimeout(() => {
      playNext();
    }, 1500);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* ジャンルフィルター (複数選択可能) */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {GENRES.map((g) => {
          const isSelected = selectedGenres.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggleGenre(g.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                isSelected
                  ? "bg-accent text-black shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.3)]"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row gap-8">
        {/* プレイヤー本体 */}
        <div className="flex-1 glass-panel p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50 pointer-events-none"></div>
          
          <div className={`w-48 h-48 rounded-full bg-black/50 border-4 border-white/10 flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden transition-all duration-1000 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
            {currentArticle?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentArticle.imageUrl} alt={currentArticle.title} className="w-full h-full object-cover opacity-80" />
            ) : (
              <ListMusic className="w-20 h-20 text-accent/50" />
            )}
            <div className="absolute w-6 h-6 rounded-full bg-[#111] border-2 border-white/10 z-10"></div>
          </div>

          <div className="text-center w-full mb-8 z-10">
            {currentArticle ? (
              <>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70 mb-4 inline-block">
                  {currentArticle.category}
                </span>
                <h2 className="text-2xl font-bold mb-2 text-white line-clamp-2 leading-tight">
                  {currentArticle.title}
                </h2>
              </>
            ) : (
              <h2 className="text-xl font-bold text-white/50">
                選択されたジャンルの記事がありません
              </h2>
            )}
          </div>

          {/* シークバー */}
          <div className="w-full mb-8 z-10">
            <div className="relative w-full h-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                disabled={!currentArticle}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className={`absolute w-full h-full bg-white/10 rounded-full overflow-hidden pointer-events-none ${!currentArticle ? 'opacity-30' : ''}`}>
                <div 
                  className="h-full bg-accent transition-all duration-100"
                  style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/50 mt-2 font-mono">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* コントロール */}
          <div className="flex items-center justify-center space-x-6 z-10 w-full">
            <button 
              onClick={playPrevious}
              disabled={currentIndex === 0 || !currentArticle}
              className="text-white/70 hover:text-white disabled:opacity-30 transition-colors"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            
            <button 
              onClick={() => skip(-15)}
              disabled={!currentArticle}
              className="text-white/70 hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center relative"
              title="15秒戻る"
            >
              <RotateCcw className="w-7 h-7" />
              <span className="absolute text-[10px] font-bold mt-1">15</span>
            </button>
            
            <button 
              onClick={() => togglePlay()}
              disabled={!currentArticle}
              className="w-16 h-16 rounded-full bg-accent text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_20px_rgba(var(--accent-color-rgb),0.4)] mx-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>

            <button 
              onClick={() => skip(15)}
              disabled={!currentArticle}
              className="text-white/70 hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center relative"
              title="15秒進む"
            >
              <RotateCw className="w-7 h-7" />
              <span className="absolute text-[10px] font-bold mt-1">15</span>
            </button>
            
            <button 
              onClick={playNext}
              disabled={currentIndex === filteredArticles.length - 1 || !currentArticle}
              className="text-white/70 hover:text-white disabled:opacity-30 transition-colors"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* 音量・速度コントロール */}
          <div className="w-full mt-8 flex items-center justify-between px-8 z-10 opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-4">
              
              {/* BGMコントロール */}
              {currentBgmUrl && (
                <div className="relative flex items-center group">
                  <button 
                    onClick={() => {
                      setShowBgmSlider(!showBgmSlider);
                      setShowVolumeSlider(false);
                    }}
                    className={`p-2 transition-colors ${bgmVolume > 0 ? 'text-accent hover:text-white' : 'text-white/40 hover:text-white'}`}
                    title="BGM音量"
                  >
                    <Music className="w-5 h-5" />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 flex items-center ${showBgmSlider ? 'max-w-[120px] w-24 opacity-100 mr-2' : 'max-w-0 w-0 opacity-0'}`}>
                    <div className="relative w-full h-1.5 bg-black/50 rounded-full mx-2 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={bgmVolume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setBgmVolume(val);
                          localStorage.setItem("bgmVolume", val.toString());
                          if (val > 0 && isPlaying && bgmRef.current && bgmRef.current.paused) {
                            bgmRef.current.play().catch(console.error);
                          }
                        }}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="absolute h-full bg-accent rounded-full pointer-events-none" style={{ width: `${bgmVolume * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div className={`flex items-center overflow-hidden transition-all duration-300 ${showBgmSlider && currentBgmUrl ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100'}`}>
                <button 
                  onClick={() => {
                    setShowVolumeSlider(!showVolumeSlider);
                    setShowBgmSlider(false);
                  }} 
                  className="p-2 hover:text-white transition-colors shrink-0"
                  title="読み上げ音量"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className={`overflow-hidden transition-all duration-300 flex items-center ${showVolumeSlider ? 'w-24 opacity-100 ml-2' : 'w-0 opacity-0'}`}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVolume(val);
                      if (isMuted && val > 0) setIsMuted(false);
                      if (val === 0) setIsMuted(true);
                    }}
                    className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent shrink-0"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={togglePlaybackRate}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/5 text-sm font-mono font-bold"
              title="再生速度を変更"
            >
              <span>{playbackRate.toFixed(2)}x</span>
            </button>
          </div>

          {currentArticle && (
            <>
              <audio
                ref={audioRef}
                src={currentArticle.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onError={handleError}
                onLoadedMetadata={handleTimeUpdate}
                autoPlay={isPlaying}
              />
              {currentBgmUrl && <audio ref={bgmRef} src={currentBgmUrl} preload="auto" loop autoPlay={isPlaying && bgmVolume > 0} />}
            </>
          )}
        </div>

        {/* プレイリスト */}
        <div className="w-full md:w-96 glass-panel rounded-3xl flex flex-col overflow-hidden max-h-[600px]">
          <div className="p-6 border-b border-white/10 bg-black/20">
            <h3 className="text-xl font-bold">プレイリスト</h3>
            <p className="text-sm text-white/50">{filteredArticles.length} tracks</p>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-white/50 text-sm">
                選択されたジャンルに<br />再生できる記事がありません。
              </div>
            ) : (
              filteredArticles.map((article, idx) => (
                <div
                  key={article.slug}
                  className={`w-full flex items-center p-2 rounded-xl mb-1 transition-colors group ${
                    idx === currentIndex ? 'bg-accent/20 border border-accent/30' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPlaying(true);
                    }}
                    className="flex-1 flex items-center space-x-3 text-left overflow-hidden mr-2"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      idx === currentIndex ? 'bg-accent text-black' : 'bg-white/10 text-white/50 group-hover:text-white'
                    }`}>
                      {idx === currentIndex && isPlaying ? <ListMusic className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className={`font-bold truncate text-sm ${idx === currentIndex ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                        {article.title}
                      </p>
                      <p className="text-xs text-white/40">{article.category}</p>
                    </div>
                  </button>
                  
                  {/* 記事ページへのリンク */}
                  <Link 
                    href={`/${article.genre}/${article.slug}`}
                    className="p-2 text-white/40 hover:text-accent transition-colors shrink-0"
                    title="記事を読む"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 連動テキスト */}
      {currentArticle && currentArticle.content && (
        <div className="max-w-4xl mx-auto w-full mt-8">
          <SpeechReaderUI 
            text={currentArticle.content} 
            title={currentArticle.title}
            colorClass={
              currentArticle.genre === 'mystery' ? 'text-accent' :
              currentArticle.genre === 'trip' ? 'text-blue-400' :
              currentArticle.genre === 'smile' ? 'text-yellow-400' :
              currentArticle.genre === 'emotion' ? 'text-pink-400' :
              currentArticle.genre === 'life' ? 'text-emerald-400' :
              currentArticle.genre === 'knowledge' ? 'text-purple-400' : 'text-white'
            } 
          />
        </div>
      )}
    </div>
  );
}
