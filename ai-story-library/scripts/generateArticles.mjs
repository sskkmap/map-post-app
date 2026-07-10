// 【稼働中・メイン必須】全ジャンルの記事を無限ループで自動生成するメインのバッチスクリプト。VOICEVOXやUnsplashとも連携。
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import { convertWavToMp3, uploadAudioToFirebase } from './audioHelpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../');
const ARTICLES_DIR = path.resolve(__dirname, '../data-articles');
const AUDIO_DIR = path.resolve(__dirname, '../public/audio');

const GENRES = [
  { id: 'mystery', file: 'ai-mystery-library-topics.txt', name: 'ミステリー', speakerId: 13 },
  { id: 'smile', file: 'ai-smile-library-topics.txt', name: '笑える話', speakerId: 3 },
  { id: 'trip', file: 'ai-trip-library-topics.txt', name: '旅行記', speakerId: 8 },
  { id: 'emotion', file: 'ai-emotion-library-topics.txt', name: '感動する話', speakerId: 2 },
  { id: 'life', file: 'ai-life-library-topics.txt', name: '人生・仕事', speakerId: 14 },
  { id: 'knowledge', file: 'ai-knowledge-library-topics.txt', name: '雑学・歴史', speakerId: 11 }
];

// フォールバック用のモデルリスト
const GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

// Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * トピックファイルの内容をパースする
 * @param {string} text 
 * @returns {Array<{title: string, description: string}>}
 */
function parseTopics(text) {
  const lines = text.split(/\r?\n/);
  const topics = [];
  let currentTopic = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('→') || trimmed.startsWith('->') || trimmed.startsWith('＞')) {
      const desc = trimmed.replace(/^[→\-\>＞\s]+/, '').trim();
      if (currentTopic) {
        currentTopic.description = currentTopic.description
          ? currentTopic.description + '\n' + desc
          : desc;
      }
    } else {
      if (currentTopic) {
        topics.push(currentTopic);
      }
      currentTopic = { title: trimmed, description: '' };
    }
  }
  if (currentTopic) {
    topics.push(currentTopic);
  }

  return topics;
}

function stringifyTopics(topics) {
  return topics.map(t => {
    let res = t.title;
    if (t.description) {
      const descLines = t.description.split(/\r?\n/);
      res += '\n' + descLines.map(d => `→${d}`).join('\n');
    }
    return res;
  }).join('\n\n') + '\n';
}

/**
 * Geminiでフォールバックしながら生成するヘルパー関数
 */
async function generateWithGeminiFallback(prompt) {
  let lastError = null;
  let isQuotaExceeded = false;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`  [Gemini] モデル '${modelName}' で試行中...`);
      const modelOptions = { model: modelName };
      if (modelName.includes('1.5') || modelName.includes('2.') || modelName.includes('3.')) {
        modelOptions.tools = [{ googleSearch: {} }];
      }
      const model = genAI.getGenerativeModel(modelOptions);
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.log(`  [Gemini] モデル '${modelName}' 失敗: ${err.message}`);
      lastError = err;
      if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota exceeded'))) {
        isQuotaExceeded = true;
      }
    }
  }

  if (isQuotaExceeded) {
    throw new Error(`全てのGeminiモデルで失敗しました。API上限(429)に達しています。最後のエラー: ${lastError.message}`);
  }
  throw new Error(`全てのGeminiモデルで失敗しました。最後のエラー: ${lastError.message}`);
}

let unsplashCooldownUntil = 0;

/**
 * Unsplash API から画像をランダムに取得する
 */
async function getUnsplashImage(keyword) {
  if (Date.now() < unsplashCooldownUntil) {
    console.log(`  [Unsplash] ⚠️ API制限待機中のためスキップします (再開予定: ${new Date(unsplashCooldownUntil).toLocaleTimeString()})`);
    return '';
  }

  const apiKey = process.env.UNSPLASH_API_KEY;
  if (!apiKey) return '';
  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&client_id=${apiKey}&orientation=landscape`);

    if (res.status === 403 || res.status === 429) {
      console.log(`  [Unsplash] ⚠️ API制限に達しました。1時間取得を休止し、サムネイル無しで生成を継続します。`);
      unsplashCooldownUntil = Date.now() + 60 * 60 * 1000; // 1時間待機
      return '';
    }

    if (res.ok) {
      const data = await res.json();
      return data.urls.regular;
    }
  } catch (e) {
    console.error("Unsplash error:", e.message);
  }
  return '';
}

/**
 * 内部リンク用に過去記事をランダムに取得する
 */
async function getRandomPastArticles(genreId, count = 2) {
  const genreDir = path.join(ARTICLES_DIR, genreId);
  try {
    const files = await fs.readdir(genreDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    if (mdFiles.length === 0) return [];

    const shuffled = mdFiles.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const articles = [];
    for (const file of selected) {
      const content = await fs.readFile(path.join(genreDir, file), 'utf-8');
      const titleMatch = content.match(/^title:\s*"(.*?)"/m);
      if (titleMatch) {
        articles.push({
          title: titleMatch[1],
          slug: file.replace('.md', '')
        });
      }
    }
    return articles;
  } catch (e) {
    return [];
  }
}

/**
 * 記事の構成（目次など）を生成する (Step 1)
 */
async function generateArticleOutline(genreName, topic) {
  const prompt = `あなたは「${genreName}」のプロの編集者です。
以下のテーマとあらすじに基づいて、詳細な記事の「見出し構成（目次）」と、画像検索用キーワード、SNSシェア用の文章を作成してください。

テーマ: ${topic.title}
あらすじ: ${topic.description || '（おまかせで展開してください）'}

【出力フォーマット】
以下のフォーマットに厳密に従ってください。マークダウンのコードブロックは不要です。

slug: (短い英語のファイル名、半角英数字とハイフンのみ)
image_keyword: (アイキャッチ画像用の英語の検索キーワード 1〜2単語)
sns_share: (ハッシュタグを含む、この記事をSNSでシェアするための140文字以内の魅力的な紹介文)
---
## (見出し1)
### (小見出し1)
## (見出し2)
...
`;
  return await generateWithGeminiFallback(prompt);
}

/**
 * 記事本文を生成する (Step 2)
 */
async function generateArticleBody(genreName, genreId, topic, outlineText, pastArticles) {
  const pastLinks = pastArticles.length > 0
    ? pastArticles.map(a => `- [${a.title}](/article/${genreId}/${a.slug})`).join('\n')
    : 'なし';

  const prompt = `あなたはプロのライターです。
以下のテーマと「目次」に従って、読者を惹きつける面白い「${genreName}」の記事本文を作成してください。

テーマ: ${topic.title}
あらすじ: ${topic.description || '（おまかせ）'}

【重要：SEO対策と文章のボリュームについて】
1. 文章量: 読者が読み応えを感じるよう、全体で2,000文字〜6,000文字程度の十分なボリュームで生成してください。
2. SEO対策:
   - 検索されやすいキーワードを意識し、見出しや本文に自然に組み込んでください。
   - 提供された目次の階層的な見出し (## や ###) をそのまま使用して構造化してください。
   - 読者の興味を惹く魅力的な導入文（リード文）と、しっかりとした結論や余韻を残す結びの文を含めてください。
3. 内部リンク:
   以下の「過去の関連記事」から関連しそうなものを1〜2個選び、記事の末尾（結びの後）に「おすすめの記事」としてリンクを貼ってください。
   【過去の関連記事】
   ${pastLinks}

【目次】
${outlineText}

出力は本文のマークダウンのみとしてください。余計な挨拶などは不要です。
`;
  return await generateWithGeminiFallback(prompt);
}

/**
 * トピックが枯渇した時に新しいトピックを生成する
 */
async function generateNewTopics(genreName) {
  const prompt = `あなたは「${genreName}」の面白い記事のアイデアを考える専門家です。
サイトに掲載するための新しい記事のトピック（タイトルとあらすじのセット）を **5件** 考えてください。

【重要：トレンドの反映とバズ要素】
- Google トレンド、Yahoo!リアルタイム検索、X(旧Twitter)のトレンド等で現在話題になっている、あるいは今後話題になりそうな要素やキーワードを推測・参考にして、アクセス数が伸びそうなキャッチーな内容にしてください。
- ターゲット読者が思わずクリックしたくなるような、魅力的でSEOに強いタイトルにしてください。

以下のフォーマットに厳密に従って出力してください。マークダウンのコードブロックや余計な挨拶は一切不要です。

[出力フォーマット]
タイトル1
→タイトル1のあらすじや展開案

タイトル2
→タイトル2のあらすじや展開案
`;

  let text = await generateWithGeminiFallback(prompt);
  text = text.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
  return text;
}

/**
 * VOICEVOXが起動しているか確認し、起動していなければ自動で立ち上げる
 */
async function ensureVoicevoxRunning() {
  const checkUrl = 'http://127.0.0.1:50021/version';
  try {
    const res = await fetch(checkUrl);
    if (res.ok) return; // すでに起動済み
  } catch (e) {
    // 起動していないので起動処理を行う
    console.log('  [VOICEVOX] アプリが起動していません。自動起動を試みます...');
    const exePath = 'C:\\Users\\owner\\AppData\\Local\\Programs\\VOICEVOX\\VOICEVOX.exe';
    spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();

    // 起動完了まで最大30秒待つ
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch(checkUrl);
        if (res.ok) {
          console.log('  [VOICEVOX] 起動完了を確認しました！');
          return;
        }
      } catch (err) { }
    }
    throw new Error('VOICEVOXアプリの自動起動に失敗したか、起動に時間がかかりすぎています。');
  }
}

function concatWavs(buffers) {
  if (buffers.length === 0) return Buffer.from([]);
  if (buffers.length === 1) return buffers[0];

  const pcmParts = [];
  let totalPcmLength = 0;
  let firstHeader = null;

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    
    // "data" チャンクのシグネチャ (0x64, 0x61, 0x74, 0x61) を動的に探す
    let dataOffset = -1;
    for (let j = 12; j < buf.length - 8; j++) {
      if (buf[j] === 0x64 && buf[j+1] === 0x61 && buf[j+2] === 0x74 && buf[j+3] === 0x61) {
        dataOffset = j;
        break;
      }
    }

    if (dataOffset === -1) {
      // 見つからない場合はフォールバックとして44バイト以降をPCMとする
      const pcm = buf.slice(44);
      pcmParts.push(pcm);
      totalPcmLength += pcm.length;
      if (i === 0) {
        firstHeader = buf.slice(0, 44);
      }
    } else {
      const pcmSize = buf.readUInt32LE(dataOffset + 4);
      const pcmStart = dataOffset + 8;
      const pcm = buf.slice(pcmStart, Math.min(buf.length, pcmStart + pcmSize));
      pcmParts.push(pcm);
      totalPcmLength += pcm.length;
      if (i === 0) {
        firstHeader = Buffer.alloc(pcmStart);
        buf.copy(firstHeader, 0, 0, pcmStart);
      }
    }
  }

  // 新しいWAVバッファを作成
  const outBuffer = Buffer.alloc(firstHeader.length + totalPcmLength);
  firstHeader.copy(outBuffer, 0);
  
  // RIFFサイズを更新 (全体サイズ - 8)
  outBuffer.writeUInt32LE(firstHeader.length + totalPcmLength - 8, 4);

  // dataチャンクのサイズを更新
  outBuffer.writeUInt32LE(totalPcmLength, firstHeader.length - 4);

  // PCMデータを連結
  let offset = firstHeader.length;
  for (let i = 0; i < pcmParts.length; i++) {
    pcmParts[i].copy(outBuffer, offset);
    offset += pcmParts[i].length;
  }

  return outBuffer;
}

/**
 * 音声を生成する (ローカル VOICEVOX)
 */
async function generateAudio(text, outputPath, speakerId = 3) {
  try {
    await ensureVoicevoxRunning();

    let safeText = text.replace(/#/g, '').replace(/\*/g, '');

    // 長いテキストを句読点や改行で分割してチャンク化（1チャンク最大200文字程度）
    const sentences = safeText.split(/(?<=[。！？\n])/);
    let chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 200) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    console.log(`  [VOICEVOX] 全${chunks.length}分割でリクエストを送信中...`);
    const wavBuffers = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      if (!chunkText) continue;

      // 1. audio_queryの作成
      const queryRes = await fetch(`http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(chunkText)}&speaker=${speakerId}`, {
        method: 'POST'
      });
      if (!queryRes.ok) throw new Error(`audio_query failed: ${queryRes.status}`);
      const queryJson = await queryRes.json();

      // 読み上げ速度を設定
      queryJson.speedScale = 1.25;
      // 音量を設定 (1.5倍)
      queryJson.volumeScale = 1.5;

      // 2. 音声合成
      const synthRes = await fetch(`http://127.0.0.1:50021/synthesis?speaker=${speakerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryJson)
      });
      if (!synthRes.ok) throw new Error(`synthesis failed: ${synthRes.status}`);

      const arrayBuffer = await synthRes.arrayBuffer();
      wavBuffers.push(Buffer.from(arrayBuffer));

      // 連続リクエストでサーバーに負荷をかけないよう少し待機
      await new Promise(r => setTimeout(r, 500));
    }

    if (wavBuffers.length > 0) {
      // 全てのWAVを結合して1つのファイルにする
      const finalBuffer = concatWavs(wavBuffers);
      await fs.writeFile(outputPath, finalBuffer);
      return;
    } else {
      throw new Error("生成された音声チャンクがありませんでした。");
    }

  } catch (err) {
    console.log(`[警告] VOICEVOX 音声生成に失敗しました。ダミー音声を生成して続行します。(${err.message})`);
    await fs.writeFile(outputPath, Buffer.from([]));
  }
}


// 1サイクルごとの待機時間（ミリ秒）: デフォルトは15分（API制限を避けるため適度に間隔をあける）
const WAIT_TIME_MINUTES = 15;
const WAIT_TIME_MS = WAIT_TIME_MINUTES * 60 * 1000;

// オーケストレータモード判定
const isOrchestratorMode = process.argv.includes('--orchestrator');

function isQuotaExceededError(err) {
  if (!err) return false;
  const msg = err.message || "";
  return msg.includes('429') || msg.toLowerCase().includes('quota exceeded');
}

async function loopMain() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  console.log(`=== 全自動・無限生成スクリプト起動 ===`);
  console.log(`- ${GENRES.length}ジャンルの記事を順番に生成します。`);
  if (isOrchestratorMode) {
    console.log(`- オーケストレータモードで動作中: 1周完了またはAPI上限到達時に終了して親スクリプトに制御を戻します。`);
  } else {
    console.log(`- 1サイクル完了ごとに ${WAIT_TIME_MINUTES} 分待機します。`);
    console.log(`- 停止するには Ctrl+C を押してください。\n`);
  }

  while (true) {
    console.log(`\n==============================================`);
    console.log(`=== 新しいサイクルを開始: ${new Date().toLocaleString()} ===`);
    console.log(`==============================================\n`);

    for (const genre of GENRES) {
      console.log(`\n--- ジャンル処理中: ${genre.name} ---`);
      const filePath = path.join(PROJECT_ROOT, genre.file);

      let fileContent = '';
      try {
        fileContent = await fs.readFile(filePath, 'utf-8');
      } catch (e) {
        console.log(`ファイルが見つかりません: ${genre.file} (新規作成対象とします)`);
      }

      let topics = parseTopics(fileContent);

      try {
        if (topics.length === 0) {
          console.log(`トピックが枯渇しています。AIに新しいトピックを生成させます...`);
          const newTopicsText = await generateNewTopics(genre.name);
          topics = parseTopics(newTopicsText);
          console.log(`新しいトピックを ${topics.length} 件生成しました。`);
        }

        if (topics.length > 0) {
          const targetTopic = topics.shift();
          console.log(`\n生成対象トピック: 「${targetTopic.title}」`);

          console.log(`[AI] 記事の構成とメタデータを生成中 (Step 1)...`);
          let outlineResult = await generateArticleOutline(genre.name, targetTopic);

          let safeTitle = `article-${Date.now()}`;
          let imageKeyword = "scenery";
          let snsShare = `${targetTopic.title} #AI記事`;

          const slugMatch = outlineResult.match(/^slug:\s*([a-zA-Z0-9\-]+)/im);
          if (slugMatch) safeTitle = slugMatch[1].toLowerCase();

          const keywordMatch = outlineResult.match(/^image_keyword:\s*(.+)/im);
          if (keywordMatch) imageKeyword = keywordMatch[1].trim();

          const snsMatch = outlineResult.match(/^sns_share:\s*(.+)/im);
          if (snsMatch) snsShare = snsMatch[1].trim();

          // メタデータ部分を削除して目次のみにする
          let outlineOnly = outlineResult.replace(/^slug:.*$/im, '')
            .replace(/^image_keyword:.*$/im, '')
            .replace(/^sns_share:.*$/im, '')
            .replace(/^---\n?/m, '')
            .trim();

          console.log(`[AI] 内部リンク用過去記事を取得中...`);
          const pastArticles = await getRandomPastArticles(genre.id, 2);

          console.log(`[AI] 記事本文を生成中 (Step 2)...`);
          let articleText = await generateArticleBody(genre.name, genre.id, targetTopic, outlineOnly, pastArticles);

          console.log(`[Unsplash] アイキャッチ画像を取得中 (Keyword: ${imageKeyword})...`);
          let imageUrl = await getUnsplashImage(imageKeyword);
          if (!imageUrl) {
            imageUrl = "/og-image.png";
            console.log(`  -> 画像が取得できなかったため、デフォルトの /og-image.png を使用します。`);
          }

          const genreDir = path.join(ARTICLES_DIR, genre.id);
          await fs.mkdir(genreDir, { recursive: true });

          // 音声保存先ディレクトリも作成
          const genreAudioDir = path.join(AUDIO_DIR, genre.id);
          await fs.mkdir(genreAudioDir, { recursive: true });

          const mdPath = path.join(genreDir, `${safeTitle}.md`);
          const audioPathWav = path.join(genreAudioDir, `${safeTitle}.wav`);
          const audioPathMp3 = path.join(genreAudioDir, `${safeTitle}.mp3`);

          // 音声の生成保存
          console.log(`[AI] 音声を生成中...`);
          let cleanArticleText = articleText.trim();
          const escapedTitle = targetTopic.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleanArticleText = cleanArticleText.replace(new RegExp(`^#*\\s*${escapedTitle}\\s*\\n+`), '').trim();
          cleanArticleText = cleanArticleText.replace(new RegExp(`^${escapedTitle}\\s*\\n+`), '').trim();

          // 音声読み上げから「おすすめの記事」や「関連記事」セクションを削除する
          cleanArticleText = cleanArticleText.replace(/#+\s*(?:おすすめの記事|おすすめ記事|関連記事|過去の関連記事)[\s\S]*$/i, '').trim();

          const textToSpeech = `タイトル。${targetTopic.title}。\n\n${cleanArticleText}`;
          await generateAudio(textToSpeech, audioPathWav, genre.speakerId);
          console.log(`✓ 音声ファイル(WAV)を保存しました: ${audioPathWav}`);

          console.log(`[変換] WAVをMP3に圧縮中...`);
          await convertWavToMp3(audioPathWav, audioPathMp3);
          await fs.unlink(audioPathWav).catch(() => { }); // 容量節約のためWAVを削除

          // Firebaseへアップロード
          const storageDest = `audio/${genre.id}/${safeTitle}.mp3`;
          const publicUrl = await uploadAudioToFirebase(audioPathMp3, storageDest);

          // アップロード完了後、ローカルの一時MP3ファイルを削除して容量を節約
          await fs.unlink(audioPathMp3).catch(() => { });

          // Markdownファイルの保存（アップロードしたURLを記載）
          const dateStr = new Date().toISOString().split('T')[0];
          const finalMdContent = `---
title: "${targetTopic.title}"
genre: "${genre.id}"
category: "${genre.name}"
tags: ["${genre.name}"]
date: "${dateStr}"
description: "${targetTopic.description}"
audio: "${publicUrl}"
image: "${imageUrl}"
sns_share: "${snsShare.replace(/"/g, '\\"')}"
---

${articleText}
`;
          await fs.writeFile(mdPath, finalMdContent, 'utf-8');
          console.log(`✓ 記事を保存しました: ${mdPath}`);

          await fs.writeFile(filePath, stringifyTopics(topics), 'utf-8');
          console.log(`✓ トピックファイルを更新しました (残り ${topics.length} 件)`);
        }
      } catch (err) {
        console.error(`ジャンル ${genre.name} 処理中に重大なエラーが発生しました:`, err.message);
        if (isOrchestratorMode && isQuotaExceededError(err)) {
          console.error(`\n[Orchestrator Mode] Gemini APIの上限 (Quota Exceeded) に達しました。処理を中断して親に制御を戻します。`);
          process.exit(99);
        }
      }

      // 次のジャンルへ行く前に少しだけ待機（APIへの連続負荷を避けるため5秒待機）
      await new Promise(r => setTimeout(r, 5000));
    }

    if (isOrchestratorMode) {
      console.log(`\n[Orchestrator Mode] 1サイクルの処理が完了しました。親スクリプトに制御を戻します。`);
      process.exit(0);
    } else {
      console.log(`\n=== 1サイクルの処理が完了しました ===`);
      console.log(`次の生成まで ${WAIT_TIME_MINUTES} 分待機します... (現在時刻: ${new Date().toLocaleString()})\n`);
      await new Promise(r => setTimeout(r, WAIT_TIME_MS));
    }
  }
}

loopMain().catch((err) => {
  console.error("ループ処理外で致命的なエラーが発生しました:", err);
  if (isOrchestratorMode && isQuotaExceededError(err)) {
    process.exit(99);
  }
  process.exit(1);
});
