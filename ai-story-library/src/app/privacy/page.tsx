import Breadcrumb from "@/components/Breadcrumb";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pb-32">
      <Breadcrumb items={[{ name: "プライバシーポリシー" }]} />
      
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-wider">プライバシーポリシー</h1>
      </header>

      <div className="prose prose-invert max-w-none prose-headings:text-accent prose-a:text-accent hover:prose-a:text-white">
        <p>本サイト（AI CONTENT PORTAL - Bubble-Share）における、ユーザーの個人情報の取り扱いについて以下の通りプライバシーポリシーを定めます。</p>

        <h2>1. 個人情報の収集について</h2>
        <p>当サイトでは、記事の投稿機能において、ユーザーが入力したテキスト情報のみを収集・保存します。投稿機能は匿名で利用可能であり、氏名、住所、電話番号、メールアドレスなどの個人を特定できる情報を収集することはありません。</p>
        
        <h2>2. 情報の利用目的</h2>
        <p>収集した情報は、以下の目的で利用されます。</p>
        <ul>
          <li>記事コンテンツとしての公開およびAIによる自動装飾・要約のため</li>
          <li>サイトの利便性向上、不具合の修正、新機能の開発のため</li>
          <li>利用規約（NGワード規定など）に違反する投稿の監視および削除のため</li>
        </ul>

        <h2>3. 情報の第三者への提供</h2>
        <p>当サイトは、法令に基づく場合を除き、収集した情報をユーザーの同意なしに第三者に提供することはありません。ただし、記事の自動装飾・要約のために、入力されたテキストデータをAIモデル（Google Gemini APIなど）へ送信することがあります。</p>

        <h2>4. 免責事項</h2>
        <p>当サイトに掲載された記事・音声は、AIによって自動生成されたフィクションや情報が含まれています。情報の正確性や完全性について保証するものではありません。当サイトの利用により生じたトラブルや損害について、運営者は一切の責任を負いません。</p>

        <h2>5. プライバシーポリシーの変更</h2>
        <p>当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。変更後のポリシーは、本ページに掲載された時点から効力を生じます。</p>
      </div>
    </div>
  );
}
