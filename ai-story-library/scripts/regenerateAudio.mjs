/*
【使用方法】
1. 対話式メニューで実行（推奨）:
   cd ai-story-library
   node --env-file=.env.local scripts/regenerateAudio.mjs
   (実行後、コンソール上で全件か一部指定ファイルかを選択できます)

2. 全記事の音声を一括で再生成:
   cd ai-story-library
   node --env-file=.env.local scripts/regenerateAudio.mjs --all

3. 指定のテキストファイル（例: target-titles.txt）に記載したタイトルのみを再生成:
   cd ai-story-library
   node --env-file=.env.local scripts/regenerateAudio.mjs target-titles.txt
*/
// 【保持推奨・メンテ用】全記事の音声ファイルを一括で作り直す（VOICEVOX再生成）ためのメンテナンス用スクリプト。
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import matter from 'gray-matter';
import { convertWavToMp3, uploadAudioToFirebase } from './audioHelpers.mjs';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../');
const ARTICLES_DIR = path.resolve(__dirname, '../data-articles');
const AUDIO_DIR = path.resolve(__dirname, '../public/audio');

const GENRES = [
  { id: 'mystery', speakerId: 13 },
  { id: 'smile', speakerId: 3 },
  { id: 'trip', speakerId: 8 },
  { id: 'emotion', speakerId: 2 },
  { id: 'life', speakerId: 14 },
  { id: 'knowledge', speakerId: 11 }
];

async function ensureVoicevoxRunning() {
  const checkUrl = 'http://127.0.0.1:50021/version';
  try {
    const res = await fetch(checkUrl);
    if (res.ok) return; // すでに起動済み
  } catch (e) {
    console.log('  [VOICEVOX] アプリが起動していません。自動起動を試みます...');
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\owner';
    const exePath = path.join(userProfile, 'AppData\\Local\\Programs\\VOICEVOX\\VOICEVOX.exe');
    try {
      const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
      child.on('error', (err) => {
        console.log(`  [VOICEVOX] 自動起動に失敗しました (${err.message})。`);
        console.log(`  手動で VOICEVOX アプリを起動してください。`);
      });
      child.unref();
    } catch (spawnErr) {
      console.log(`  [VOICEVOX] 自動起動の呼び出しに失敗しました (${spawnErr.message})。`);
    }

    console.log('  [VOICEVOX] VOICEVOXの起動を確認中 (最大15秒待ちます)...');
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await fetch(checkUrl);
        if (res.ok) {
          console.log('  [VOICEVOX] 起動完了を確認しました！');
          return;
        }
      } catch (err) { }
    }
    throw new Error('VOICEVOXアプリが起動していません。手動でVOICEVOXアプリを起動してから再実行してください。');
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

async function generateAudio(text, outputPath, speakerId = 3) {
  try {
    await ensureVoicevoxRunning();

    let safeText = text.replace(/#/g, '').replace(/\*/g, '');
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

      const queryRes = await fetch(`http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(chunkText)}&speaker=${speakerId}`, {
        method: 'POST'
      });
      if (!queryRes.ok) throw new Error(`audio_query failed: ${queryRes.status}`);
      const queryJson = await queryRes.json();

      queryJson.speedScale = 1.25;
      queryJson.volumeScale = 1.5;

      const synthRes = await fetch(`http://127.0.0.1:50021/synthesis?speaker=${speakerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryJson)
      });
      if (!synthRes.ok) throw new Error(`synthesis failed: ${synthRes.status}`);

      const arrayBuffer = await synthRes.arrayBuffer();
      wavBuffers.push(Buffer.from(arrayBuffer));

      await new Promise(r => setTimeout(r, 500));
    }

    if (wavBuffers.length > 0) {
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

function getAudioFileName(audioValue, mdFile) {
  if (!audioValue) {
    return mdFile.replace('.md', '.wav');
  }
  // URLだった場合はクエリパラメータを除去して末尾のファイル名を取得
  if (audioValue.startsWith('http://') || audioValue.startsWith('https://')) {
    const cleanUrl = audioValue.split('?')[0];
    return path.basename(cleanUrl);
  }
  return audioValue;
}

async function findArticleByTitle(title) {
  for (const genre of GENRES) {
    const genreDir = path.join(ARTICLES_DIR, genre.id);
    try {
      const files = await fs.readdir(genreDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(genreDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: body } = matter(content);
        const slug = file.replace('.md', '').trim();

        if (
          (data.title && data.title.trim() === title.trim()) ||
          (slug === title.trim())
        ) {
          return {
            genre: genre.id,
            speakerId: genre.speakerId,
            audioFileName: getAudioFileName(data.audio, file),
            body,
            filePath
          };
        }
      }
    } catch (e) {
      // ディレクトリが存在しない場合はスキップ
    }
  }
  return null;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function getAllArticles() {
  const list = [];
  const genres = await fs.readdir(ARTICLES_DIR);
  for (const genreId of genres) {
    const genre = GENRES.find(g => g.id === genreId);
    if (!genre) continue;
    const genreDir = path.join(ARTICLES_DIR, genreId);
    try {
      const files = await fs.readdir(genreDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(genreDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: body } = matter(content);
        const slug = file.replace('.md', '').trim();
        list.push({
          title: data.title || slug,
          genre: genreId,
          speakerId: genre.speakerId,
          audioFileName: getAudioFileName(data.audio, file),
          body,
          filePath
        });
      }
    } catch (e) {}
  }
  return list;
}

async function main() {
  let mode = null; // 'all' or 'file'
  let targetFile = null;

  const arg = process.argv[2];
  if (arg === '--all') {
    mode = 'all';
  } else if (arg) {
    mode = 'file';
    targetFile = arg;
  } else {
    console.log('=== 音声再生成モードの選択 ===');
    console.log('1: 全ての記事の音声を再生成する');
    console.log('2: target-titles.txt に記載された記事の音声のみ再生成する');
    const answer = await askQuestion('選択してください (1 または 2): ');
    
    if (answer.trim() === '1') {
      mode = 'all';
    } else if (answer.trim() === '2') {
      mode = 'file';
      targetFile = 'target-titles.txt';
    } else {
      console.log('キャンセルされました。');
      process.exit(0);
    }
  }

  if (mode === 'all') {
    console.log('\n[モード] 全記事の音声再生成を開始します...');
    const articles = await getAllArticles();
    console.log(`全${articles.length}件の記事が見つかりました。\n`);

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const title = article.title;
      console.log(`\n--- 処理中 (${i + 1}/${articles.length}): 「${title}」 ---`);
      
      const genreAudioDir = path.join(AUDIO_DIR, article.genre);
      await fs.mkdir(genreAudioDir, { recursive: true });

      const audioPathWav = path.join(genreAudioDir, article.audioFileName.replace('.mp3', '.wav').replace('.wav', '.wav'));
      const audioPathMp3 = path.join(genreAudioDir, article.audioFileName.replace('.wav', '.mp3'));
      const safeTitle = path.basename(audioPathMp3, '.mp3');
      console.log(`[生成] 記事を発見 (${article.genre})。音声を生成します...`);

      let cleanArticleText = article.body.trim();
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleanArticleText = cleanArticleText.replace(new RegExp(`^#*\\s*${escapedTitle}\\s*\\n+`), '').trim();
      cleanArticleText = cleanArticleText.replace(new RegExp(`^${escapedTitle}\\s*\\n+`), '').trim();

      const textToSpeech = `タイトル。${title}。\n\n${cleanArticleText}`;

      await generateAudio(textToSpeech, audioPathWav, article.speakerId);
      console.log(`✓ 音声ファイル(WAV)を再生成しました: ${audioPathWav}`);

      console.log(`[変換] WAVをMP3に圧縮中...`);
      await convertWavToMp3(audioPathWav, audioPathMp3);
      await fs.unlink(audioPathWav).catch(() => { });

      const hasFirebaseConfig = !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
      if (hasFirebaseConfig) {
        const storageDest = `audio/${article.genre}/${safeTitle}.mp3`;
        const publicUrl = await uploadAudioToFirebase(audioPathMp3, storageDest);

        // Markdownファイルを更新して新しいURLを書き込む
        const mdPath = article.filePath;
        let mdContent = await fs.readFile(mdPath, 'utf-8');
        mdContent = mdContent.replace(/audio:\s*".*?"/, `audio: "${publicUrl}"`);
        await fs.writeFile(mdPath, mdContent, 'utf-8');

        console.log(`✓ 記事(${title}.md)の音声URLをFirebaseのものに更新しました`);
      } else {
        console.log(`✓ [ローカル保存] MP3ファイルがローカルに保存されました: ${audioPathMp3}`);
        console.log(`  (Firebase環境変数が設定されていないため、アップロードとMarkdown更新をスキップしました)`);
      }
    }
    console.log('\n✓ 全ての音声ファイルの再生成が完了しました！');

  } else {
    const targetPath = path.resolve(process.cwd(), targetFile);
    console.log(`\n[モード] ファイル「${targetFile}」からタイトルを読み込みます...`);
    
    while (true) {
      let fileContent;
      try {
        fileContent = await fs.readFile(targetPath, 'utf-8');
      } catch (err) {
        console.error(`ファイルが見つかりません: ${targetPath}`);
        process.exit(1);
      }

      let lines = fileContent.split(/\r?\n/);
      const targetIndex = lines.findIndex(t => t.trim().length > 0 && !t.trim().startsWith('#'));

      if (targetIndex === -1) {
        console.log('\n✓ 対象のタイトルが全て処理され、ファイルが空白（またはコメントのみ）になりました。');
        break;
      }

      const rawLine = lines[targetIndex].trim();
      let title = rawLine;
      if (title.toLowerCase().endsWith('.md')) {
        title = path.basename(title, '.md');
      }

      console.log(`\n--- 処理中: 「${title}」 ---`);
      const article = await findArticleByTitle(title);

      if (!article) {
        console.log(`[スキップ] 該当する記事が見つかりませんでした。リストから削除して次に進みます。`);
      } else {
        const genreAudioDir = path.join(AUDIO_DIR, article.genre);
        await fs.mkdir(genreAudioDir, { recursive: true });

        const audioPathWav = path.join(genreAudioDir, article.audioFileName.replace('.mp3', '.wav').replace('.wav', '.wav'));
        const audioPathMp3 = path.join(genreAudioDir, article.audioFileName.replace('.wav', '.mp3'));
        const safeTitle = path.basename(audioPathMp3, '.mp3');
        console.log(`[生成] 記事を発見 (${article.genre})。音声を生成します...`);

        let cleanArticleText = article.body.trim();
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanArticleText = cleanArticleText.replace(new RegExp(`^#*\\s*${escapedTitle}\\s*\\n+`), '').trim();
        cleanArticleText = cleanArticleText.replace(new RegExp(`^${escapedTitle}\\s*\\n+`), '').trim();

        const textToSpeech = `タイトル。${title}。\n\n${cleanArticleText}`;

        await generateAudio(textToSpeech, audioPathWav, article.speakerId);
        console.log(`✓ 音声ファイル(WAV)を再生成しました: ${audioPathWav}`);

        console.log(`[変換] WAVをMP3に圧縮中...`);
        await convertWavToMp3(audioPathWav, audioPathMp3);
        await fs.unlink(audioPathWav).catch(() => { });

        const hasFirebaseConfig = !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
        if (hasFirebaseConfig) {
          const storageDest = `audio/${article.genre}/${safeTitle}.mp3`;
          const publicUrl = await uploadAudioToFirebase(audioPathMp3, storageDest);

          // Markdownファイルを更新して新しいURLを書き込む
          const mdPath = path.join(ARTICLES_DIR, article.genre, `${title}.md`);
          let mdContent = await fs.readFile(mdPath, 'utf-8');
          mdContent = mdContent.replace(/audio:\s*".*?"/, `audio: "${publicUrl}"`);
          await fs.writeFile(mdPath, mdContent, 'utf-8');

          console.log(`✓ 記事(${title}.md)の音声URLをFirebaseのものに更新しました`);
        } else {
          console.log(`✓ [ローカル保存] MP3ファイルがローカルに保存されました: ${audioPathMp3}`);
          console.log(`  (Firebase環境変数が設定されていないため、アップロードとMarkdown更新をスキップしました)`);
        }
      }

      // 処理が完了（またはスキップ）したら、ファイルから該当行を削除して上書き
      lines.splice(targetIndex, 1);
      await fs.writeFile(targetPath, lines.join('\n'), 'utf-8');
      console.log(`✓ 処理済みの行をファイルから削除しました。`);
    }
  }
}

main().catch(console.error);
