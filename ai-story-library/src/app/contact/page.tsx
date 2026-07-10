import { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { Mail, ShieldCheck, Clock } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "お問い合わせ (Contact) | Bubble-Share",
  description: "AI CONTENT PORTAL - Bubble-Shareへのご意見、ご要望、お問い合わせはこちらからお願いいたします。",
};

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 flex flex-col items-center">
      <div className="w-full">
        <Breadcrumb items={[{ name: "お問い合わせ" }]} />
      </div>

      <header className="mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-widest mb-4">
          <span className="neon-text">CONTACT</span>
        </h1>
        <p className="text-white/60">ご意見、ご要望、お問い合わせはこちらからお気軽にお寄せください。</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full mt-4">
        {/* 運営情報カード */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-40 pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              <h2 className="text-xl font-bold border-b border-white/10 pb-4 flex items-center space-x-2">
                <Mail className="w-5 h-5 text-accent animate-pulse" />
                <span>運営事務局情報</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">運営団体</p>
                  <p className="font-bold text-white text-base">
                    AI CONTENT PORTAL<br />
                    Bubble Share運営委員会
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/40 mb-1">メールアドレス</p>
                  <a 
                    href="mailto:sharemapbubble@gmail.com" 
                    className="font-mono text-accent hover:underline text-sm break-all font-bold block"
                  >
                    sharemapbubble@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-6 border-t border-white/10 space-y-3 text-xs text-white/50">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-accent/75" />
                <span>受付時間: 24時間受付</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-accent/75" />
                <span>ご入力情報はSSLで暗号化されます。</span>
              </div>
            </div>
          </div>
        </div>

        {/* 問い合わせフォーム */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent opacity-30 pointer-events-none"></div>
            <div className="relative z-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
