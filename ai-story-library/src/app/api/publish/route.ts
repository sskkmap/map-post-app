import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { getNgWordsUsed } from '@/lib/ngWords';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GENRE_MAP: Record<string, string> = {
  'mystery': 'ミステリー',
  'trip': '旅行記',
  'smile': '笑える話',
  'emotion': '感動する話',
  'life': '人生・仕事',
  'knowledge': '雑学・歴史'
};

const GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function enrichWithGemini(genreName: string, rawTitle: string, rawContent: string) {
  const prompt = `あなたは「${genreName}」のプロの編集者です。
ユーザーから投稿された以下の文章を、より読みやすく見栄えの良い記事になるようマークダウンで推敲・装飾し、さらにこの文章に最も適した細かい「サブカテゴリ名（例: カフェ巡り、不思議な体験 など）」を考えてください。
元の文章の内容やストーリーは決して変えずに、改行を整理したり、適度に見出し(##)や太字(**)を追加して読みやすく装飾するだけに留めてください。
また、見出し(##)を追加する際は、検索エンジンで検索されやすいキーワードを意識したSEOに強い見出しにしてください。

[ユーザー投稿タイトル]
${rawTitle}

[ユーザー投稿本文]
${rawContent}

結果は必ず以下のJSONフォーマットのみで出力してください。マークダウンのコードブロック(\`\`\`json)などは絶対に含めないでください。
{
  "category": "サブカテゴリ名（10文字以内）",
  "content": "マークダウン装飾された本文"
}`;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // 余計なマークダウン記法を取り除く
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(text);
    } catch (e) {
      console.error(`Model ${modelName} failed.`, e);
    }
  }
  
  // すべてのモデルで失敗した場合は元のテキストをそのまま返す
  return {
    category: genreName,
    content: rawContent
  };
}

export async function POST(req: Request) {
  try {
    const { genre, title, content } = await req.json();

    if (!genre || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (content.length < 100) {
      return NextResponse.json({ error: '本文は100文字以上で入力してください。' }, { status: 400 });
    }

    const titleNgWords = getNgWordsUsed(title);
    const contentNgWords = getNgWordsUsed(content);
    if (titleNgWords.length > 0 || contentNgWords.length > 0) {
      return NextResponse.json({ error: '不適切な単語が含まれています。' }, { status: 400 });
    }

    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_").substring(0, 50);
    const dateStr = new Date().toISOString().split('T')[0];
    const categoryNameBase = GENRE_MAP[genre] || genre;
    
    // AIによる装飾・カテゴリ生成の実行
    let finalCategory = categoryNameBase;
    let finalContent = content;
    
    if (process.env.GEMINI_API_KEY) {
      const enriched = await enrichWithGemini(categoryNameBase, title, content);
      if (enriched.category && enriched.content) {
        finalCategory = enriched.category;
        finalContent = enriched.content;
      }
    }
    
    const mdFileName = `${safeTitle}.md`;
    const audioFileName = `${safeTitle}.wav`;
    
    const genreDir = path.join(process.cwd(), 'data-articles', genre);
    const genreAudioDir = path.join(process.cwd(), 'public', 'audio', genre);
    
    // ディレクトリ作成
    await fs.mkdir(genreDir, { recursive: true });
    await fs.mkdir(genreAudioDir, { recursive: true });

    const mdPath = path.join(genreDir, mdFileName);
    const audioPath = path.join(genreAudioDir, audioFileName);

    const mdContent = `---
title: "${title}"
genre: "${genre}"
category: "${finalCategory}"
tags: ["${categoryNameBase}", "${finalCategory}", "ユーザー投稿"]
date: "${dateStr}"
description: "${content.substring(0, 100).replace(/\n/g, '')}..."
audio: "${audioFileName}"
---

${finalContent}
`;

    // 記事の保存
    await fs.writeFile(mdPath, mdContent, 'utf-8');
    
    // ダミーの音声ファイルを作成（fixMissingAudio.mjsの対象にするためサイズ0で作成）
    await fs.writeFile(audioPath, Buffer.from([]));

    // バックグラウンドで音声生成スクリプトをキック
    const cwdStr = process.cwd();
    const scriptPath = `${cwdStr}/scripts/fixMissingAudio.mjs`;
    const runSpawn = new Function('spawnFn', 'path', 'return spawnFn("node", [path], { detached: true, stdio: "ignore" })');
    const child = runSpawn(spawn, scriptPath);
    if (child && typeof child.unref === 'function') {
      child.unref();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to publish article:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
