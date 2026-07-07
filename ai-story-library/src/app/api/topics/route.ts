import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getNgWordsUsed } from '@/lib/ngWords';

export async function POST(req: Request) {
  try {
    const { genre, title, description } = await req.json();

    if (!genre || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const titleNgWords = getNgWordsUsed(title);
    const descNgWords = getNgWordsUsed(description || "");
    if (titleNgWords.length > 0 || descNgWords.length > 0) {
      return NextResponse.json({ error: '不適切な単語が含まれています。' }, { status: 400 });
    }

    // ジャンルに基づいて対象のトピックファイルを決定
    const fileName = `ai-${genre}-library-topics.txt`;
    const filePath = path.join(process.cwd(), fileName);

    // 追記するテキストを整形
    let newEntry = `\n\n${title}`;
    if (description) {
      const descLines = description.split(/\r?\n/).map((line: string) => `→${line}`).join('\n');
      newEntry += `\n${descLines}`;
    }

    // ファイルに追記
    await fs.appendFile(filePath, newEntry, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to append topic:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
