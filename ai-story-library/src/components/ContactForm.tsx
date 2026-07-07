"use client";

import { useState } from "react";
import { Send, Copy, Check, Loader2 } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "一般のお問い合わせ",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("sharemapbubble@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      alert("必須項目を入力してください。");
      return;
    }

    setIsSubmitting(true);

    // 送信シミュレーション (数秒待って完了)
    // バックエンドサービスやAPIルートが設定されていないため、mailtoリンクを開くか送信完了アニメーションを見せます
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      
      // 送信内容をメーラーで送れるように mailto リンクを開くフォールバック
      const mailtoLink = `mailto:sharemapbubble@gmail.com?subject=${encodeURIComponent(
        `[Bubble-Share問い合わせ] ${formData.subject}`
      )}&body=${encodeURIComponent(
        `名前: ${formData.name}\nメールアドレス: ${formData.email}\n\n内容:\n${formData.message}`
      )}`;
      
      window.location.href = mailtoLink;
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-accent/20 border-2 border-accent text-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-color-rgb),0.3)]">
          <Check className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">お問い合わせ内容の作成完了</h3>
          <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
            メーラーが起動します。起動しない場合は、お手数ですが下記のメールアドレス宛てに直接ご連絡をお願いいたします。
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center justify-between w-full max-w-sm">
          <span className="font-mono text-sm text-white/80 select-all">sharemapbubble@gmail.com</span>
          <button 
            onClick={handleCopyEmail}
            className="p-2 hover:bg-white/10 rounded-lg text-accent hover:text-white transition-colors"
            title="メールアドレスをコピー"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <button 
          onClick={() => {
            setIsSuccess(false);
            setFormData({ name: "", email: "", subject: "一般のお問い合わせ", message: "" });
          }}
          className="px-6 py-2.5 rounded-full border border-white/20 hover:bg-white/10 text-sm transition-all"
        >
          新しく問い合わせる
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* お名前 */}
        <div className="space-y-2">
          <label htmlFor="contact-name" className="block text-sm font-bold text-white/80">
            お名前 <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            id="contact-name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="山田 太郎"
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-accent text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all placeholder:text-white/30"
          />
        </div>

        {/* メールアドレス */}
        <div className="space-y-2">
          <label htmlFor="contact-email" className="block text-sm font-bold text-white/80">
            メールアドレス <span className="text-accent">*</span>
          </label>
          <input
            type="email"
            id="contact-email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="example@gmail.com"
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-accent text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all placeholder:text-white/30"
          />
        </div>
      </div>

      {/* 件名 */}
      <div className="space-y-2">
        <label htmlFor="contact-subject" className="block text-sm font-bold text-white/80">
          お問い合わせ件名
        </label>
        <select
          id="contact-subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="w-full bg-[#151515] hover:bg-white/10 border border-white/10 focus:border-accent text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all cursor-pointer"
        >
          <option value="一般のお問い合わせ">一般のお問い合わせ</option>
          <option value="ご意見・ご要望">ご意見・ご要望</option>
          <option value="不具合・バグのご報告">不具合・バグのご報告</option>
          <option value="削除依頼・権利に関する申し立て">削除依頼・権利に関する申し立て</option>
          <option value="その他">その他</option>
        </select>
      </div>

      {/* 本文 */}
      <div className="space-y-2">
        <label htmlFor="contact-message" className="block text-sm font-bold text-white/80">
          お問い合わせ内容 <span className="text-accent">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          value={formData.message}
          onChange={handleChange}
          placeholder="お問い合わせ内容をこちらに入力してください..."
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-accent text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all placeholder:text-white/30 resize-y"
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/10">
        {/* 直接メールコピー */}
        <button
          type="button"
          onClick={handleCopyEmail}
          className="text-xs text-white/50 hover:text-accent flex items-center space-x-1.5 transition-colors self-start md:self-center"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "コピー完了！" : "メールアドレスをコピー"}</span>
        </button>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-black hover:bg-accent/80 transition-all font-bold px-8 py-3 rounded-full text-sm flex items-center justify-center space-x-2 shrink-0 shadow-[0_0_20px_rgba(var(--accent-color-rgb),0.3)] disabled:opacity-50 active:scale-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>作成中...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>メッセージを作成</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
