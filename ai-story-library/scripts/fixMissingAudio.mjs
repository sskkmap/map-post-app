// 【保持推奨・メンテ用】エラー等で音声が欠損している記事をスキャンし、不足分だけ再生成・アップロードするリカバリ用スクリプト。
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const ARTICLES_DIR = path.resolve(__dirname, '../data-articles');
const AUDIO_DIR = path.resolve(__dirname, '../public/audio');

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
    throw new Error('VOICEVOXアプリの自動起動に失敗しました。');
  }
}

/**
 * 複数のWAVバッファを結合する関数
 */
function concatWavs(buffers) {
  if (buffers.length === 0) return Buffer.from([]);
  if (buffers.length === 1) return buffers[0];

  let totalPcmLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalPcmLength += buffers[i].length - 44;
  }

  const outBuffer = Buffer.alloc(44 + totalPcmLength);

  // 最初のバッファからヘッダ（44バイト）をコピー
  buffers[0].copy(outBuffer, 0, 0, 44);

  // ChunkSize (offset 4, 4 bytes, Little Endian) = 36 + Subchunk2Size
  outBuffer.writeUInt32LE(36 + totalPcmLength, 4);
  // Subchunk2Size (offset 40, 4 bytes, Little Endian) = total PCM length
  outBuffer.writeUInt32LE(totalPcmLength, 40);

  let offset = 44;
  for (let i = 0; i < buffers.length; i++) {
    const pcmData = buffers[i].slice(44);
    pcmData.copy(outBuffer, offset);
    offset += pcmData.length;
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

    console.log(`    [VOICEVOX] 全${chunks.length}分割でリクエストを送信中...`);
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
    console.log(`    [エラー] VOICEVOX 音声生成に失敗しました: ${err.message}`);
    // 失敗した場合は0バイトで作成して次の機会に任せる
    await fs.writeFile(outputPath, Buffer.from([]));
  }
}

async function main() {
  console.log("=== 音声データ再生成スクリプト開始 ===");
  const genres = await fs.readdir(ARTICLES_DIR);

  const genreSpeakers = {
    'mystery': 13, // 青山龍星
    'smile': 3,    // ずんだもん
    'trip': 8      // 春日部つむぎ
  };

  for (const genre of genres) {
    const genreDir = path.join(ARTICLES_DIR, genre);
    const stat = await fs.stat(genreDir).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;

    const files = await fs.readdir(genreDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const mdPath = path.join(genreDir, file);
      const fileContent = await fs.readFile(mdPath, 'utf-8');
      const parsed = matter(fileContent);

      const title = parsed.data.title;
      const audioFileName = parsed.data.audio;

      if (!title || !audioFileName) continue;

      const currentAudioPath = path.join(AUDIO_DIR, genre, audioFileName);

      let needsFix = false;
      try {
        const audioStat = await fs.stat(currentAudioPath);
        if (audioStat.size === 0) needsFix = true;
      } catch (err) {
        // ファイルが存在しない
        needsFix = true;
      }

      if (needsFix) {
        console.log(`\n【修復対象】${title} (現在の音声: ${audioFileName})`);

        const slug = file.replace(/\.md$/, '');
        const newAudioFileName = `${slug}.wav`;
        const newAudioPath = path.join(AUDIO_DIR, genre, newAudioFileName);

        try {
          let cleanContent = parsed.content.trim();
          const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          cleanContent = cleanContent.replace(new RegExp(`^#*\\s*${escapedTitle}\\s*\\n+`), '').trim();
          cleanContent = cleanContent.replace(new RegExp(`^${escapedTitle}\\s*\\n+`), '').trim();

          const textToSpeech = `タイトル。${title}。\n\n${cleanContent}`;
          const speakerId = genreSpeakers[genre] || 3;
          await generateAudio(textToSpeech, newAudioPath, speakerId);
          console.log(`  ✓ 新しい音声ファイルを作成しました: ${newAudioFileName}`);

          // マークダウンのフロントマターを書き換え
          parsed.data.audio = newAudioFileName;
          const newMdContent = matter.stringify(parsed.content, parsed.data);
          await fs.writeFile(mdPath, newMdContent, 'utf-8');
          console.log(`  ✓ 記事の設定を更新しました`);

          // 古いダミーファイルを削除 (.mp3 で生成したファイル等)
          if (audioFileName !== newAudioFileName) {
            try {
              await fs.unlink(currentAudioPath);
              console.log(`  ✓ 古いダミーファイル (${audioFileName}) を削除しました`);
            } catch (e) { } // 無視
          }
        } catch (err) {
          console.error(`  ✕ 修復に失敗しました: ${err.message}`);
        }
      }
    }
  }
  console.log("\n=== 全ての処理が完了しました ===");
}

main().catch(console.error);
