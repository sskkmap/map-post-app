// 【稼働中・必須】ビルド時 (prebuild/predev) に実行され、検索用の読み仮名マップ (kanaMap.json) を生成するスクリプト。
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import kuromoji from 'kuromoji';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTICLES_DIR = path.resolve(__dirname, '../data-articles');
const OUTPUT_FILE = path.resolve(__dirname, '../src/lib/kana_map.json');
const DIC_PATH = path.resolve(__dirname, '../node_modules/kuromoji/dict');

// カタカナをひらがなに変換
function katakanaToHiragana(str) {
  if (!str) return '';
  return str.replace(/[\u30a1-\u30f6]/g, match =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

// 記事からすべてのタグとカテゴリを抽出
async function getAllTagsAndCategories() {
  const genres = ['mystery', 'smile', 'trip', 'emotion', 'life', 'knowledge'];
  const words = new Set();
  
  for (const genre of genres) {
    const genreDir = path.join(ARTICLES_DIR, genre);
    try {
      const files = await fs.readdir(genreDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(genreDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(content);
        if (data.category) words.add(data.category);
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach(t => words.add(t));
        }
      }
    } catch (e) {
      // ディレクトリが存在しない場合はスキップ
    }
  }
  return Array.from(words);
}

// Kuromoji トークナイザーの初期化
function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DIC_PATH }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

async function main() {
  console.log('タグ・カテゴリの抽出を開始します...');
  const words = await getAllTagsAndCategories();
  console.log(`${words.length}個のユニークなタグ・カテゴリを発見しました。`);

  console.log('Kuromoji 辞書を読み込んでいます...');
  const tokenizer = await buildTokenizer();

  const kanaMap = {};

  for (const word of words) {
    const tokens = tokenizer.tokenize(word);
    
    // reading（読み/カタカナ）を結合。記号などはreadingがない場合があるのでsurface_formでフォールバック
    const readingKatakana = tokens.map(token => token.reading || token.surface_form).join('');
    
    // カタカナをひらがなに変換
    const readingHiragana = katakanaToHiragana(readingKatakana);
    
    // JSONの形式として配列にしておく（SearchUI側が配列を期待しているため）
    kanaMap[word] = [readingHiragana];
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(kanaMap, null, 2), 'utf-8');
  
  console.log(`✓ ひらがな辞書を生成しました: ${OUTPUT_FILE}`);
}

main().catch(console.error);
