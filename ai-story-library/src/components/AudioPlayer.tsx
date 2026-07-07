"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, SkipForward, RotateCcw, RotateCw, Music } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  nextArticleUrl?: string; // 次の記事のURL（連続再生用）
  bgmUrl?: string; // BGMのURL
  title?: string;
  category?: string;
  imageUrl?: string;
}

export default function AudioPlayer({ audioUrl, nextArticleUrl, bgmUrl, title, category, imageUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [bgmVolume, setBgmVolume] = useState(0.15);
  const [showBgmSlider, setShowBgmSlider] = useState(false);
  const RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const savedRate = localStorage.getItem("playbackRate");
    if (savedRate) {
      setPlaybackRate(parseFloat(savedRate));
    }
    const savedBgmVol = localStorage.getItem("bgmVolume");
    if (savedBgmVol !== null) setBgmVolume(parseFloat(savedBgmVol));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const currentTime = audio.currentTime;
      const duration = audio.duration || 1;
      const currentProgress = (currentTime / duration) * 100;
      setProgress(currentProgress);
      window.dispatchEvent(new CustomEvent("audioProgress", { detail: { progress: currentProgress, currentTime, duration } }));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      if (bgmRef.current) bgmRef.current.pause();
      // 連続再生ロジック（次の記事へ自動遷移し、autoplayパラメータを付与）
      if (nextArticleUrl) {
        window.location.href = `${nextArticleUrl}?autoplay=true`;
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("autoplay") === "true") {
        setTimeout(() => {
          audio.play().then(() => {
            setIsPlaying(true);
            if (bgmRef.current && bgmVolume > 0) {
              bgmRef.current.play().catch(e => console.error("BGM Autoplay prevented:", e));
            }
          }).catch(e => console.error("Autoplay prevented:", e));
        }, 500);
      }
    }

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [nextArticleUrl, bgmVolume]);

  // コンポーネントのアンマウント時のみ音声を停止する
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (bgmRef.current) bgmRef.current.pause();
    };
  }, []);

  useEffect(() => {
    if (title && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: category || "AI CONTENT PORTAL",
        album: "AI CONTENT PORTAL - Bubble-Share",
        artwork: [
          { src: imageUrl || "/favicon.ico", sizes: "512x512", type: "image/png" }
        ]
      });

      navigator.mediaSession.setActionHandler("play", () => togglePlay());
      navigator.mediaSession.setActionHandler("pause", () => togglePlay());
      navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
      if (nextArticleUrl) {
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          window.location.href = `${nextArticleUrl}?autoplay=true`;
        });
      } else {
        navigator.mediaSession.setActionHandler("nexttrack", null);
      }
    }
  }, [title, category, imageUrl, nextArticleUrl, isPlaying, bgmVolume]);

  // 音量の適用
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (bgmRef.current) {
      bgmRef.current.volume = (isMuted || bgmVolume === 0) ? 0 : (bgmVolume * 0.2);
    }
  }, [volume, bgmVolume, isMuted]);

  // 再生速度の適用
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlaybackRate = () => {
    const nextIndex = (RATES.indexOf(playbackRate) + 1) % RATES.length;
    const nextRate = RATES[nextIndex];
    setPlaybackRate(nextRate);
    localStorage.setItem("playbackRate", nextRate.toString());
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (bgmRef.current) bgmRef.current.pause();
      } else {
        audioRef.current.play();
        if (bgmRef.current && bgmVolume > 0) bgmRef.current.play().catch(e => console.error(e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current && audioRef.current.duration) {
      const newTime = audioRef.current.currentTime + seconds;
      audioRef.current.currentTime = Math.max(0, Math.min(newTime, audioRef.current.duration));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current && audioRef.current.duration) {
      const seekTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50">
      {isPlaying && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          <div className="max-w-3xl mx-auto flex justify-center gap-6 mb-3 px-4 pointer-events-auto">
            <button 
              onClick={() => skip(-15)}
              className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/80 rounded-full px-4 py-2 flex items-center gap-2 text-sm transition-all shadow-lg active:scale-95"
            >
              <RotateCcw className="w-4 h-4" /> 15秒戻る
            </button>
            <button 
              onClick={() => skip(15)}
              className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/80 rounded-full px-4 py-2 flex items-center gap-2 text-sm transition-all shadow-lg active:scale-95"
            >
              15秒進む <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="w-full glass-panel border-t border-white/10 p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-accent/20 text-accent hover:bg-accent/30 transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 ml-1" />}
          </button>

          <div className="flex-1 flex items-center relative h-2">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.1"
              value={progress || 0} 
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* カスタムプログレスバーの見た目 */}
            <div className="absolute w-full h-full bg-black/50 rounded-full overflow-hidden pointer-events-none">
              <div 
                className="h-full bg-accent transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-white/60 shrink-0">
            {/* BGMコントロール */}
            {bgmUrl && (
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
                <div className={`overflow-hidden transition-all duration-300 flex items-center ${showBgmSlider ? 'w-20 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
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

            {/* 音量コントロール */}
            <div 
              className={`relative flex items-center group overflow-hidden transition-all duration-300 ${showBgmSlider ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}
            >
              <button 
                onClick={() => {
                  setShowVolumeSlider(!showVolumeSlider);
                  setShowBgmSlider(false);
                }}
                className="p-2 hover:text-white transition-colors"
                title="読み上げ音量"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              {/* 音量スライダー (クリック時に表示) */}
              <div className={`overflow-hidden transition-all duration-300 flex items-center ${showVolumeSlider ? 'w-20 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
                <div className="relative w-full h-1.5 bg-black/50 rounded-full mx-2 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (isMuted && val > 0) setIsMuted(false);
                      if (val === 0) setIsMuted(true);
                    }}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="absolute h-full bg-accent rounded-full pointer-events-none" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
                </div>
              </div>
            </div>

            {nextArticleUrl && (
              <button 
                onClick={() => window.location.href = `${nextArticleUrl}?autoplay=true`}
                className="hover:text-white transition-colors p-2"
                title="次の記事へ"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={togglePlaybackRate}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/5 text-sm font-mono font-bold ml-2"
              title="再生速度を変更"
            >
              <span>{playbackRate.toFixed(2)}x</span>
            </button>
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      {bgmUrl && <audio ref={bgmRef} src={bgmUrl} preload="auto" loop />}
    </div>
  );
}
