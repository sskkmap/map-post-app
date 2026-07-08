/*
C:\Users\owner\bubble-share\ai-story-library\target-titles.txtに記事のタイトル絶対パスをコピペしてから使用する
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
    const exePath = 'C:\\Users\\owner\\AppData\\Local\\Programs\\VOICEVOX\\VOICEVOX.exe';
    spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref();

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

  let totalPcmLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalPcmLength += buffers[i].length - 44;
  }

  const outBuffer = Buffer.alloc(44 + totalPcmLength);
  buffers[0].copy(outBuffer, 0, 0, 44);
  outBuffer.writeUInt32LE(36 + totalPcmLength, 4);
  outBuffer.writeUInt32LE(totalPcmLength, 40);

  let offset = 44;
  for (let i = 0; i < buffers.length; i++) {
    const pcmData = buffers[i].slice(44);
    pcmData.copy(outBuffer, offset);
    offset += pcmData.length;
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
            audioFileName: data.audio || file.replace('.md', '.wav'),
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

async function main() {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error('エラー: 引数にタイトルを記載したテキストファイルを指定してください。');
    console.error('使用例: node --env-file=.env.local scripts/regenerateAudio.mjs target-titles.txt');
    process.exit(1);
  }

  const targetPath = path.resolve(process.cwd(), targetFile);

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

      const storageDest = `audio/${article.genre}/${safeTitle}.mp3`;
      const publicUrl = await uploadAudioToFirebase(audioPathMp3, storageDest);

      // Markdownファイルを更新して新しいURLを書き込む
      const mdPath = path.join(ARTICLES_DIR, article.genre, `${title}.md`);
      let mdContent = await fs.readFile(mdPath, 'utf-8');
      mdContent = mdContent.replace(/audio:\s*".*?"/, `audio: "${publicUrl}"`);
      await fs.writeFile(mdPath, mdContent, 'utf-8');

      console.log(`✓ 記事(${title}.md)の音声URLをFirebaseのものに更新しました`);
    }

    // 処理が完了（またはスキップ）したら、ファイルから該当行を削除して上書き
    lines.splice(targetIndex, 1);
    await fs.writeFile(targetPath, lines.join('\n'), 'utf-8');
    console.log(`✓ 処理済みの行をファイルから削除しました。`);
  }
}

main().catch(console.error);
