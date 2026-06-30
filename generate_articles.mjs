import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { execSync } from 'child_process';

// -------------------------------------------------------------
// 1. 設定部分
// -------------------------------------------------------------

// .env.localファイルを読み込む（手動で読み込む処理）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    console.log('[DEBUG] .env.local found. Parsing...');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/['"]/g, '');
            console.log(`[DEBUG] Found Key: '${key}'`);
            process.env[key] = val;
        }
    });
} else {
    console.log('[DEBUG] .env.local NOT found at', envPath);
}

// APIキーの確認
const API_KEY = process.env.GEMINI_API_KEY;
console.log(`[DEBUG] process.env.GEMINI_API_KEY = ${API_KEY ? '設定あり' : '設定なし(undefined)'}`);
if (!API_KEY) {
    console.error('エラー: .env.local に GEMINI_API_KEY が設定されていません。');
    process.exit(1);
}

// AIのセットアップ
const genAI = new GoogleGenerativeAI(API_KEY);

// フォールバック（予備）として使用するモデルのリスト
const MODEL_LIST = [
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    'gemini-2.5-flash-lite',
    "gemini-2.0-flash",
    "gemini-2.0-pro",
    'gemini-2.0-flash-lite',
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-8b",
    "gemini-1.0-pro",
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest'
];



// 選択可能なカテゴリー一覧
const categories = [
    { id: "git", name: "消化器系", color: "hsl(180, 60%, 40%)" },
    { id: "cvs", name: "循環器系", color: "hsl(0, 70%, 60%)" },
    { id: "res", name: "呼吸器系", color: "hsl(140, 60%, 50%)" },
    { id: "meta", name: "代謝・内分泌", color: "hsl(30, 90%, 60%)" },
    { id: "neuro", name: "神経系", color: "hsl(260, 60%, 60%)" },
    { id: "immune", name: "免疫系", color: "hsl(300, 60%, 55%)" },
    { id: "heme", name: "血液", color: "hsl(350, 65%, 55%)" },
    { id: "ped", name: "小児科", color: "hsl(200, 80%, 55%)" },
    { id: "tool", name: "ツール", color: "hsla(64, 100%, 40%, 1.00)" },
    { id: "admin", name: "医療事務", color: "hsla(0, 0%, 0%, 1.00)" },
    { id: "zaitaku", name: "在宅医療", color: "hsl(210, 20%, 50%)" },
    { id: "other", name: "雑談・その他", color: "hsl(210, 20%, 50%)" },
];
const categoryNames = categories.map(c => c.name);

//---記事作成用設定----------------------------------------------------------------------------------------
// 一度に作成する最大記事数（テスト用）
// ※ 全てを一気に作成する場合は "nolimit" と入力してください（ダブルクォーテーションで囲んでください）。
//　コマンド　node generate_articles.mjs
const MAX_ARTICLES = "nolimit";

// 自動生成後にパソコンをシャットダウンするかどうか（true: する, false: しない）
const SHUTDOWN_WHEN_DONE = true;

// 作成したい記事のテーマを topics.txt から読み込む
const topicsFilePath = path.join(__dirname, 'topics.txt');
let topics = [];
if (fs.existsSync(topicsFilePath)) {
    const fileContent = fs.readFileSync(topicsFilePath, 'utf8');
    // 空行を除外して配列にする
    topics = fileContent.split(/\r?\n/).map(t => t.trim()).filter(t => t.length > 0);
} else {
    console.error(`エラー: ${topicsFilePath} が見つかりません。先に topics.txt を作成してください。`);
    process.exit(1);
}

//-------------------------------------------------------------------------------------------

// 保存先のフォルダ
const OUTPUT_DIR = path.join(__dirname, 'data-articles');

// -------------------------------------------------------------
// 2. 記事作成のプロンプト（AIへのお願い）
// -------------------------------------------------------------

// 参考記事（スタイルや装飾の参考にさせる）の読み込み
const referenceFilePath = path.join(OUTPUT_DIR, 'intestinal-drugs-differences.md');
let referenceArticle = "";
if (fs.existsSync(referenceFilePath)) {
    referenceArticle = fs.readFileSync(referenceFilePath, 'utf8');
}

function generatePrompt(title) {
    const referenceBlock = referenceArticle ? `
以下の記事は、あなたが作成する記事の「理想的な参考フォーマットと装飾の例」です。
この参考記事の装飾スタイル（エピソードの囲み枠、カード風のレイアウトなど）、口調、構成を強く意識して作成してください。

【参考記事（理想的なフォーマット）】
\`\`\`markdown
${referenceArticle}
\`\`\`
` : "";

    return `
あなたは現役の薬剤師向けの専門的なライターです。
以下のテーマについて、薬剤師が実務で役立つような記事を作成してください。

テーマ: ${title}

【執筆における重要ルール】
1. **SEO対策**: このテーマから想定される検索キーワードを3〜5個自ら考え、それらを自然に、かつ効果的に見出しや本文に散りばめてください。検索意図を満たす充実した内容にしてください。
2. **表（テーブル）の活用**: 薬の比較、特徴、用量など、一覧にした方がわかりやすい情報は積極的にMarkdownの表（Table）を用いて視覚的に整理してください。また表内の改行が自然になるように横スクロール対応になってもよいので横幅を確保するか適切な改行を行うようにしてください。
3. **リッチな装飾**: 参考記事にあるようなHTMLタグ（div等）を用いたハイライト枠や装飾を取り入れ、全体的に読みやすく美しい記事に仕上げてください。
4. **引用の明記（トグルボタン）**: 記事内で具体的なデータ、薬の効能、ガイドラインなどを解説している各見出し（## などのセクション）の最後に、そのセクション全体の内容の根拠となる情報元をまとめてトグルボタンで明記してください。セクションの途中に挟むのではなく、必ず各セクションの最後の部分に以下のHTML形式で追加してください。（Google検索機能を活用して、PMDAやガイドライン等の実在する正確な情報を取得してください。架空の情報は絶対に記載しないでください。また、リンクを記載する際は生のURLテキストをそのまま貼るのではなく、必ず「参照元のサイト名や記事タイトル」をリンクテキストにしたHTMLリンクタグ（<a href="...">サイト名</a>）を使用してください）
   <details><summary>根拠となる情報元の詳細を見る</summary>引用元文章: ここにこのセクションの根拠となる文章や解説を記載<br>参照元: <a href="https://...">〇〇ガイドライン等（サイト名やページ名）</a></details>
5. **薬機法などの遵守（リーガルチェック）**: 記事の内容は、薬機法（医薬品医療機器等法）等の関連法規を厳密に遵守してください。生成する文章全体に対してセルフリーガルチェックを行い、誇大広告、未承認薬への医学的効能効果の標榜、安全性の過信（「絶対に安全」「副作用がない」など）を招く表現がないよう、客観的かつ正確な記載を徹底してください。
${referenceBlock}
また、以下のカテゴリー一覧の中から、今回の記事に最も適切なものを1つだけ選び、その名前をそのままフロントマターの category に指定してください。
【選択可能なカテゴリー】
${categoryNames.join('、')}

以下のフォーマット（Markdown形式）で出力してください。
最初と最後の \`\`\`markdown と \`\`\` は出力に含めないでください。
フロントマターの slug には、記事のURLとなる「英単語をハイフンで繋いだ短い文字列」を考えて指定してください（例: hypertension-guidance）。
tags には、あなたが考えたキーワードの配列を指定してください。

---
slug: "（AIが考えた英単語のファイル名）"
title: "${title}"
date: "${new Date().toISOString().split('T')[0]}"
category: "（上で選んだカテゴリー名をそのまま記載）"
tags: ["（AIが考えたキーワード1）", "（キーワード2）", "（キーワード3）"]
published: false
description: "この記事の簡単な説明文（1〜2文）"
summary: "記事の要約（一覧画面で表示されます）"
---

# ${title}

（ここから本文を記述してください。見出しは ## や ### を使ってください。）
（最初にこの記事を書くにあたった動機やきっかけなどのエピソードを書いてください。その後、薬剤師が読んで「なるほど、明日から使えそう」と思えるような、具体的で実践的な内容にしてください。）
`;
}

// -------------------------------------------------------------
// 3. 実行部分
// -------------------------------------------------------------
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 複数のモデルを順番に試し、成功した時点でテキストを返す関数
async function generateWithFallback(prompt) {
    for (const modelName of MODEL_LIST) {
        try {
            console.log(`   👉 モデル [${modelName}] で生成を試みます...`);
            const currentModel = genAI.getGenerativeModel({ 
                model: modelName,
                tools: [{ googleSearch: {} }]
            });
            const result = await currentModel.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.log(`   ⚠️ [${modelName}] エラー発生: ${error.message.split('\n')[0]}`);
            console.log(`   🔄 次の予備モデルに切り替えます...`);
            await sleep(2000); // 切り替え前に少し待機
        }
    }
    // すべてのモデルで失敗した場合
    throw new Error("利用可能なすべてのモデルでエラーが発生しました。");
}

async function main() {
    // MAX_ARTICLESが "nolimit" や "no-limit" の場合は全件、それ以外は指定件数で絞り込み
    const isAll = typeof MAX_ARTICLES === 'string' && (MAX_ARTICLES.includes('limit') || MAX_ARTICLES === 'all');
    const targetTopics = isAll ? topics : topics.slice(0, MAX_ARTICLES);
    console.log(`🤖 記事の自動生成を開始します。対象件数: ${targetTopics.length}件 (リスト全 ${topics.length}件中)`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (let i = 0; i < targetTopics.length; i++) {
        const title = targetTopics[i];
        console.log(`\n[${i + 1}/${targetTopics.length}] 「${title}」の作成中...`);

        try {
            const prompt = generatePrompt(title);

            // 旧: const result = await model.generateContent(prompt);
            // 新: 複数モデルを順番に試す関数を呼び出す
            let text = await generateWithFallback(prompt);

            // 不要なマークダウン記号(```markdown)が紛れ込んだら削除する
            text = text.replace(/^```markdown\n/i, '').replace(/```$/i, '').trim();

            // AIが参考記事につられて published: true にしてしまうのを防ぐため強制置換
            text = text.replace(/published:\s*true/g, 'published: false');

            // HTMLブロック（divなど）の中では **太字** のマークダウンが効かずにそのまま表示されてしまうため、
            // 確実に太字になるように <strong> タグへ一括置換する
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // AIが考えたslug（ファイル名）を抽出する
            const slugMatch = text.match(/slug:\s*"?([a-zA-Z0-9\-]+)"?/);
            const fileName = slugMatch ? `${slugMatch[1]}.md` : `article-${Date.now()}.md`;

            const filePath = path.join(OUTPUT_DIR, fileName);
            fs.writeFileSync(filePath, text, 'utf8');

            console.log(`✅ 保存完了: ${fileName}`);

            // 成功したら配列から削除し、topics.txt を上書き保存する
            topics = topics.filter(t => t !== title);
            fs.writeFileSync(topicsFilePath, topics.join('\n'), 'utf8');
            console.log(`📝 topics.txt から「${title}」を削除しました。残り: ${topics.length}件`);

            // APIの制限（レートリミット）を避けるため、次の記事作成まで少し待機（例: 5秒）
            if (i < targetTopics.length - 1) {
                console.log(`⏳ 次の記事作成まで5秒待機します...`);
                await sleep(5000);
            }

        } catch (error) {
            console.error(`❌ エラー発生 (${title}):`, error.message);
            console.log(`🛑 API制限の可能性が高いです。12時間待機してから再開します...`);
            await sleep(12 * 60 * 60 * 1000); // 12時間待機
            i--; // エラーになった記事をもう一度やり直すため、インデックスを戻す
        }
    }

    console.log(`\n🎉 すべての処理が完了しました！`);

    // 全ての記事生成が完了し、topicsが空になったらシャットダウンを実行
    /*
    if (SHUTDOWN_WHEN_DONE && topics.length === 0) {
        console.log(`\n⚠️ 全てのテーマが完了したため、60秒後にパソコンをシャットダウンします。`);
        console.log(`※キャンセルする場合は、コマンドプロンプトを開いて「shutdown -a」と入力してください。`);
        try {
            execSync('shutdown /s /t 60');
        } catch (e) {
            console.error('シャットダウンの実行に失敗しました:', e.message);
        }
    }
        */
}

main();
