"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { containsNgWords } from "@/lib/ngWords";

interface CommentData {
  id: string;
  userName: string;
  content: string;
  createdAt: Date | null;
}

interface ArticleCommentsProps {
  slug: string;
}

const COMMENTS_PER_PAGE = 5;

export default function ArticleComments({ slug }: ArticleCommentsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const commentsTopRef = useRef<HTMLDivElement>(null);
  
  // フォームステート
  const [nameInput, setNameInput] = useState("");
  const [contentInput, setContentInput] = useState("");

  const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const fetchComments = async () => {
    if (!slug || !isConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "comments"),
        where("slug", "==", slug)
      );
      const querySnapshot = await getDocs(q);
      
      const fetchedComments: CommentData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedComments.push({
          id: doc.id,
          userName: data.userName || "名無しさん",
          content: data.content || "",
          // serverTimestamp()がまだ解決されていない（ローカルの一時キャッシュ）場合を考慮
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
        });
      });

      // クライアント側で日付の古い順（上から下へ読める順）にソート
      fetchedComments.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contentInput.trim() || isSubmitting || !isConfigured) return;

    setIsSubmitting(true);
    const finalName = nameInput.trim() || "名無しさん";
    const finalContent = contentInput.trim();

    if (containsNgWords(finalName) || containsNgWords(finalContent)) {
      alert("投稿内容に不適切な単語が含まれています。修正してください。");
      setIsSubmitting(false);
      return;
    }

    try {
      // 楽観的UI更新：即座にローカルステートに追加して表示を速くする
      const tempId = `temp-${Date.now()}`;
      const newComment: CommentData = {
        id: tempId,
        userName: finalName,
        content: finalContent,
        createdAt: new Date(),
      };
      
      setComments(prev => [...prev, newComment]);
      
      // 入力欄をクリア
      setContentInput("");
      
      // 自分が投稿したコメントが見えるように表示件数を増やす
      if (comments.length >= visibleCount) {
        setVisibleCount(comments.length + 1);
      }

      // Firestoreへ保存
      await addDoc(collection(db, "comments"), {
        slug,
        userName: finalName,
        content: finalContent,
        createdAt: serverTimestamp(),
      });
      
      // 正確なタイムスタンプを取得するために再取得（任意）
      // await fetchComments(); 
      
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("コメントの投稿に失敗しました。");
    } finally {
      setIsSubmitting(false);
      
      // 送信後、5秒間のクールダウンを設定
      setIsOnCooldown(true);
      setCooldownRemaining(5);
      
      const intervalId = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setIsOnCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleShowMore = () => {
    setVisibleCount(prev => prev + COMMENTS_PER_PAGE);
  };

  const handleClose = () => {
    setVisibleCount(COMMENTS_PER_PAGE);
    if (commentsTopRef.current) {
      // コメントセクションのトップへスムーズにスクロール
      commentsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isConfigured) return null;

  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = visibleCount < comments.length;

  return (
    <div className="w-full max-w-3xl mx-auto mt-16 mb-24 px-4" ref={commentsTopRef}>
      <div className="flex items-center space-x-2 mb-8">
        <MessageSquare className="w-6 h-6 text-white/70" />
        <h2 className="text-2xl font-bold">コメント</h2>
        <span className="text-white/50 ml-2">({comments.length})</span>
      </div>

      {/* コメント投稿フォーム */}
      <div className="glass-panel p-4 sm:p-6 mb-10 rounded-2xl border border-white/10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
          <input
            type="text"
            placeholder="お名前（省略時は「名無しさん」）"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full sm:w-1/2 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
            maxLength={30}
          />
          <textarea
            placeholder="感想やメッセージをどうぞ！"
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors min-h-[100px] resize-y"
            required
            maxLength={200}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">
              {contentInput.length} / 200文字
            </span>
            <button
              type="submit"
              disabled={isSubmitting || isOnCooldown || !contentInput.trim()}
              className="bg-accent text-white px-6 py-2 rounded-full font-medium flex items-center space-x-2 hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <Send className="w-4 h-4" />
              <span>{isOnCooldown ? `待機中 (${cooldownRemaining}s)` : isSubmitting ? '送信中...' : '投稿する'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* コメント一覧 */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center text-white/50 py-8">読み込み中...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-white/40 py-8 border border-white/5 border-dashed rounded-xl">
            まだコメントはありません。<br/>一番乗りで感想を書いてみませんか？
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {visibleComments.map((comment) => (
              <div key={comment.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-accent/90">{comment.userName}</span>
                  <span className="text-xs text-white/40">
                    {comment.createdAt ? comment.createdAt.toLocaleString('ja-JP', { 
                      year: 'numeric', month: '2-digit', day: '2-digit', 
                      hour: '2-digit', minute: '2-digit'
                    }) : '送信中...'}
                  </span>
                </div>
                <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* さらに表示 / 閉じるボタン */}
        {(hasMore || visibleCount > COMMENTS_PER_PAGE) && (
          <div className="flex justify-center pt-6 space-x-4">
            {hasMore && (
              <button
                onClick={handleShowMore}
                className="flex items-center space-x-2 text-white/50 hover:text-white/90 transition-colors px-6 py-3 rounded-full hover:bg-white/5"
              >
                <span>さらに表示</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            {visibleCount > COMMENTS_PER_PAGE && (
              <button
                onClick={handleClose}
                className="flex items-center space-x-2 text-white/50 hover:text-white/90 transition-colors px-6 py-3 rounded-full hover:bg-white/5"
              >
                <span>閉じる</span>
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
