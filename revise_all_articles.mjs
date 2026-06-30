import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

// .env.localファイルの読み込み
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
        }
    });
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('エラー: .env.local に GEMINI_API_KEY が設定されていません。');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_LIST = [
    // 枠に余裕があるFlashモデルを最優先に変更
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    // 予備としてそれ以外のモデルを下部に配置
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    "gemini-2.5-pro",
    "gemini-2.0-pro",
    'gemini-2.0-flash-lite',
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b-001",
    "gemini-1.5-pro-exp-0827",
    "gemini-1.5-flash-exp-0827",
    "gemini-1.0-pro",
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-pro-latest'
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
            await sleep(2000);
        }
    }
    throw new Error("すべてのモデルでエラーが発生しました。");
}

async function main() {
    const articlesDir = path.join(__dirname, 'data-articles');

    if (!fs.existsSync(articlesDir)) {
        console.error(`エラー: フォルダが見つかりません (${articlesDir})`);
        return;
    }

    const files = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));
    console.log(`🤖 既存記事の一括修正を開始します。対象件数: ${files.length}件`);

    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        const filePath = path.join(articlesDir, fileName);

        // ※お試しで作成した「revised-」から始まるファイルはスキップ
        if (fileName.startsWith('revised-')) continue;

        console.log(`\n[${i + 1}/${files.length}] 「${fileName}」を処理中...`);
        const originalContent = fs.readFileSync(filePath, 'utf8');

        // すでに修正済みのファイル（<details><summary> が含まれている）はスキップ
        if (originalContent.includes('<details><summary>根拠となる情報元の詳細を見る</summary>')) {
            console.log(`⏭️ 既に修正済みの形式のためスキップします。`);
            continue;
        }

        const prompt = `
以下のマークダウン形式のブログ記事について、次の2つのルールを適用して修正し、全文を出力してください。
なお、元の記事のフロントマター（---で囲まれた部分）や全体的な構成、タグ、タイトルなどは維持してください。

【修正ルール】
1. **引用の明記（トグルボタン）**: 記事内で具体的なデータ、薬の効能、ガイドラインなどを解説している各見出し（## などのセクション）の最後に、そのセクション全体の内容の根拠となる情報元をまとめてトグルボタンで記載してください。セクションの途中に挟むのではなく、必ず各セクションの最後の部分に以下のHTML形式で追加してください。（Google検索機能を活用して、PMDAやガイドライン等の実在する正確な情報を取得してください。架空の情報は絶対に記載しないでください。また、リンクを記載する際は生のURLテキストをそのまま貼るのではなく、必ず「参照元のサイト名や記事タイトル」をリンクテキストにしたHTMLリンクタグ（<a href="...">サイト名</a>）を使用してください）
   <details><summary>根拠となる情報元の詳細を見る</summary>引用元文章: ここにこのセクションの根拠となる文章や解説を記載<br>参照元: <a href="https://...">〇〇ガイドライン等（サイト名やページ名）</a></details>
2. **薬機法などの遵守（リーガルチェック）**: 記事の内容は、薬機法（医薬品医療機器等法）等の関連法規を厳密に遵守してください。誇大広告、未承認薬への医学的効能効果の標榜、安全性の過信（「絶対に安全」「副作用がない」など）を招く表現がある場合は、客観的かつ正確な記載に修正してください。

【元の記事】
\`\`\`markdown
${originalContent}
\`\`\`

修正後の記事のテキスト（フロントマター含む）のみを出力してください。
最初と最後の \`\`\`markdown と \`\`\` は出力に含めないでください。
`;

        try {
            let text = await generateWithFallback(prompt);
            text = text.replace(/^```markdown\n/i, '').replace(/```$/i, '').trim();

            fs.writeFileSync(filePath, text, 'utf8');
            console.log(`✅ 修正完了・上書き保存: ${fileName}`);

            // APIの制限（レートリミット）を避けるため、次の記事作成まで5秒待機
            if (i < files.length - 1) {
                console.log(`⏳ 次の処理まで5秒待機します...`);
                await sleep(15000);
            }
        } catch (error) {
            console.error(`❌ エラー発生 (${fileName}):`, error.message);
            console.log(`🛑 API制限の可能性が高いです。12時間待機してから再開します...`);
            await sleep(12 * 60 * 60 * 1000); // 12時間待機
            i--; // エラーになった記事をもう一度やり直すため、インデックスを戻す
        }
    }

    console.log(`\n🎉 すべての既存記事の修正処理が完了しました！`);
}

main();
