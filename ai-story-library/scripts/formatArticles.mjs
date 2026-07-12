import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTICLES_DIR = path.resolve(__dirname, '../data-articles');

// 見出しからキーワードを抽出
function extractKeywordsFromHeadings(content) {
  const headings = content.match(/^#+\s+(.*)$/gm) || [];
  const keywords = new Set();
  headings.forEach(heading => {
    let text = heading.replace(/^#+\s+/, '').replace(/[「」『』（）！？!?,.、。\s]/g, ' ');
    // 2文字以上の漢字・カタカナのまとまりを抽出
    const matches = text.match(/[\u4e00-\u9faf\u30a0-\u30ff]{2,}/g) || [];
    matches.forEach(m => keywords.add(m));
  });
  return Array.from(keywords);
}

function processContent(content) {
  // キーワード抽出
  const keywords = extractKeywordsFromHeadings(content);
  // 長い順にソート（部分一致対策）
  keywords.sort((a, b) => b.length - a.length);

  let lines = content.split('\n');
  let resultLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 見出しや空行はスキップ
    if (line.startsWith('#') || line.trim() === '') {
      resultLines.push(line);
      continue;
    }

    // 1. キーワード太字化
    keywords.forEach(kw => {
      // 既に太字（**kw**）になっているものは避ける
      const regex = new RegExp(`(?<!\\*\\*)${kw}(?!\\*\\*)`, 'g');
      line = line.replace(regex, `**${kw}**`);
    });

    // 2. かぎかっことセリフの強調
    let isBlockquote = false;
    // 行頭の「 で始まる場合は引用化 (既に > の場合は除く)
    if (/^「/.test(line)) {
      line = `> ${line}`;
      isBlockquote = true;
    }
    
    // 文中の「」『』を太字に
    // 既に **「...」** になっているものをリセットして付け直す
    line = line.replace(/\*\*([「『].*?[」』])\*\*/g, '$1');
    line = line.replace(/([「『].*?[」』])/g, '**$1**');

    // 3. 長い段落の自動改行
    // リストや引用、HTMLタグの行は除外
    if (!line.startsWith('-') && !line.startsWith('*') && !line.startsWith('>') && !isBlockquote && !line.startsWith('<')) {
      if (line.length > 60) {
        let segments = line.split('。');
        let newSegments = [];
        let currentLength = 0;
        let currentSegmentGroup = [];
        
        for (let j = 0; j < segments.length; j++) {
          let seg = segments[j];
          if (j < segments.length - 1) {
            seg += '。';
          }
          currentSegmentGroup.push(seg);
          currentLength += seg.length;
          
          // 累積文字数が60文字を超えたらそこで改行
          if (currentLength >= 60 && j < segments.length - 1) {
            newSegments.push(currentSegmentGroup.join(''));
            currentSegmentGroup = [];
            currentLength = 0;
          }
        }
        if (currentSegmentGroup.length > 0) {
          newSegments.push(currentSegmentGroup.join(''));
        }
        line = newSegments.join('\n\n');
      }
    }

    resultLines.push(line);
  }
  
  return resultLines.join('\n');
}

async function main() {
  const genres = ['mystery', 'smile', 'trip', 'emotion', 'life', 'knowledge'];
  
  for (const genre of genres) {
    const genreDir = path.join(ARTICLES_DIR, genre);
    try {
      const files = await fs.readdir(genreDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(genreDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // フロントマターと本文を分割
        const match = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)(.*)$/s);
        if (!match) {
          console.warn(`Skipping (no frontmatter): ${filePath}`);
          continue;
        }

        const frontmatterStr = match[1];
        const bodyStr = match[2];
        
        const newBody = processContent(bodyStr);
        // 連続する空行を整理（3つ以上の改行を2つに）
        const cleanBody = newBody.replace(/\n{3,}/g, '\n\n');
        
        const finalContent = frontmatterStr + cleanBody;
        
        await fs.writeFile(filePath, finalContent, 'utf-8');
        console.log(`装飾完了: ${filePath}`);
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error(`エラー (${genre}):`, e);
      }
    }
  }
  console.log('すべての記事の自動装飾が完了しました！');
}

main();
