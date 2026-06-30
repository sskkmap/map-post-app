import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AboutPage() {
    const startYear = 2022;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0 is January, 3 is April
    const yearOfExperience = currentYear - startYear + (currentMonth >= 3 ? 1 : 0);

    return (
        <main style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.1), transparent 40%), radial-gradient(circle at bottom left, hsl(260, 60%, 60% / 0.1), transparent 40%)',
            paddingBottom: '4rem'
        }}>
            <Header />

            <div className="container" style={{ maxWidth: '800px' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--secondary))' }}>
                        サイトについて
                    </h1>

                    <div className="article-content">
                        <p>
                            「薬剤師一年目の勉強NOTE」へようこそ。
                        </p>
                        <p>
                            本サイトは、新人薬剤師が日々の業務の中で直面する疑問や、処方箋の奥に隠された医師の意図、最新ガイドラインの要点などを分かりやすくまとめた実践的な情報メディアです。
                        </p>
                        <p>
                            単なる教科書的な知識の羅列ではなく、「現場で患者さんを前にしたときにどう考えるか」「限られた処方情報から病態をどう読み解き、どうアセスメントするか」という、臨床の最前線で求められるリアルな視点を何よりも大切にしています。
                        </p>

                        <h3>運営者情報</h3>
                        <ul>
                            <li style={{ marginBottom: '0.5rem' }}><strong>運営者:</strong> 薬剤師（あおさん）</li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>経歴:</strong><br />
                                薬剤師{yearOfExperience}年目。現在は個人在宅医療をメインに行う地域密着型の調剤薬局に勤務しています。<br />
                                日々の調剤・服薬指導業務に加え、薬局内の新人教育や定期的な研修の企画・実施も担当した経験がある。後輩薬剤師が自信を持って患者さんと向き合えるよう、現場目線での実践的なサポートを行っています。
                            </li>
                            <li style={{ marginBottom: '0.5rem' }}>
                                <strong>サイトを作った理由:</strong><br />
                                私自身、薬剤師になったばかりの頃は「学校で学んだ知識をどう現場で活かせばいいのか」が分からず、不安を抱えながら業務にあたっていました。<br />
                                その後、新人教育や研修を担当する中で、「かつての自分と同じように悩んでいる若手薬剤師がたくさんいる」ことに気づきました。<br />
                                全ての薬剤師が不安なく、自信を持って日々の業務に取り組めるようサポートしたい。そして、私が現場で培ってきた「処方箋から病態を読み解く力」や実践的な知識を、より多くの先生方に還元したい。そんな強い思いから、このサイトを立ち上げました。<br />
                                このサイトが、皆さんの毎日の業務を少しでも助け、成長を後押しできるような「頼れるノート」になれば嬉しいです。
                            </li>
                        </ul>

                        <h3>情報の引用・参考方針</h3>
                        <p>
                            本サイトの記事は、最新のガイドライン、添付文書、インタビューフォーム、その他信頼できる医学的・薬学的文献を元に作成しています。また、私自身の臨床経験（E-E-A-T）を踏まえ、現場で役立つ実践的な視点を交えて解説を行っています。
                        </p>

                        <h3>目的</h3>
                        <ul>
                            <li>自身の知識の整理と備忘録</li>
                            <li>同じように悩む新人薬剤師の先生方の参考になれば幸いです</li>
                        </ul>

                        <blockquote>
                            <p><strong>免責事項</strong></p>
                            <p>本サイトの内容は正確性を期していますが、あくまで個人の学習ノートです。実際の投薬・指導に関しては、最新の添付文書やガイドラインを参照し、ご自身の責任において行ってください。</p>
                        </blockquote>
                    </div>
                </div>
            </div>
            <div className="container" style={{ minHeight: '60px', display: 'flex', alignItems: 'center' }}>
                <Link href="/" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                    ← ホームに戻る
                </Link>
            </div>
            <Footer />
        </main>
    );
}
