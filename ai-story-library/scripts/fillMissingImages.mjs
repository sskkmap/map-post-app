//これはサムネイル画像が無い記事にサムネイルを追加するスクリプトgenerate_articlesで処理しきれなかった画像追加を行う

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTICLES_DIR = path.resolve(__dirname, '../data-articles');

// 1時間のスリープ (ミリ秒) - Unsplashのレートリミットリセット目安
const ONE_HOUR_MS = 60 * 60 * 1000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUnsplashImage(keyword) {
  const apiKey = process.env.UNSPLASH_API_KEY;
  if (!apiKey) {
    throw new Error("UNSPLASH_API_KEY is not set.");
  }

  const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&client_id=${apiKey}&orientation=landscape`);

  if (res.status === 403 || res.status === 429) {
    throw new Error(`RateLimitExceeded`);
  }

  if (res.ok) {
    const data = await res.json();
    return data.urls.regular;
  }

  return null;
}

async function processFile(filePath) {
  const fileContents = await fs.readFile(filePath, 'utf8');
  const matterResult = matter(fileContents);

  // 既に画像があるか（デフォルトの /og-image.png 等ではないか）チェック
  const currentImage = matterResult.data.image;
  if (currentImage && currentImage.trim() !== '' && !currentImage.includes('og-image.png') && !currentImage.includes('favicon.ico')) {
    // 既に有効な画像が設定されているのでスキップ
    return { status: 'skipped', message: 'すでに画像が設定されています。' };
  }

  // キーワードの決定 (category か genre, もしくは scenery)
  const keyword = matterResult.data.category || matterResult.data.genre || "scenery";

  let imageUrl = null;
  try {
    imageUrl = await getUnsplashImage(keyword);
  } catch (err) {
    if (err.message === 'RateLimitExceeded') {
      throw err; // レートリミットは上位でキャッチする
    }
    return { status: 'error', message: err.message };
  }

  if (!imageUrl) {
    return { status: 'error', message: '画像の取得に失敗しました。' };
  }

  // フロントマターに画像を追加/上書き
  matterResult.data.image = imageUrl;

  // matter.stringify で戻す
  const newContent = matter.stringify(matterResult.content, matterResult.data);
  await fs.writeFile(filePath, newContent, 'utf8');

  return { status: 'success', imageUrl };
}

// オーケストレータモード判定
const isOrchestratorMode = process.argv.includes('--orchestrator');

async function main() {
  console.log("==================================================");
  console.log("=== アイキャッチ画像一括追加スクリプトを開始します ===");
  if (isOrchestratorMode) console.log("=== (Orchestrator Mode) ===");
  console.log("==================================================\n");

  let genres;
  try {
    genres = await fs.readdir(ARTICLES_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`記事ディレクトリが見つかりません: ${ARTICLES_DIR}`);
    process.exit(1);
  }

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const dirent of genres) {
    if (!dirent.isDirectory()) continue;
    const genreDir = path.join(ARTICLES_DIR, dirent.name);
    const files = await fs.readdir(genreDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(genreDir, file);
      console.log(`[チェック中] ${dirent.name}/${file}...`);

      let success = false;
      while (!success) {
        try {
          const result = await processFile(filePath);
          if (result.status === 'skipped') {
            console.log(`  -> スキップ: ${result.message}`);
            skippedCount++;
            success = true; // 完了
          } else if (result.status === 'success') {
            console.log(`  -> 成功✨: 新しい画像を追加しました (${result.imageUrl})`);
            processedCount++;
            success = true;
            // APIへの連続負荷を避けるため少し待機
            await sleep(1500);
          } else {
            console.log(`  -> エラー: ${result.message}`);
            errorCount++;
            success = true; // そのファイルはスキップして次へ
          }
        } catch (err) {
          if (err.message === 'RateLimitExceeded') {
            console.log(`\n⚠️ Unsplash API の利用制限(Rate Limit)に達しました。`);
            
            if (isOrchestratorMode) {
              console.log(`[Orchestrator Mode] 上限に達したため、処理を中断して親スクリプトに制御を戻します。`);
              process.exit(99);
            }

            console.log(`💤 1時間 (60分) 待機モードに入ります... (現在時刻: ${new Date().toLocaleString()})`);

            // 待機中のログ出力（10分おき）
            for (let i = 0; i < 6; i++) {
              await sleep(10 * 60 * 1000); // 10分待機
              console.log(`...待機中... 残り約 ${60 - (i + 1) * 10} 分`);
            }

            console.log(`🌅 待機が完了しました。処理を再開します: ${new Date().toLocaleString()}\n`);
            // success = false のままループするので、同じファイルをリトライする
          } else {
            console.error(`  -> 予期せぬエラー: ${err.message}`);
            errorCount++;
            success = true;
          }
        }
      }
    }
  }

  console.log("\n==================================================");
  console.log("=== すべての処理が完了しました ===");
  console.log(`・新しく追加した記事: ${processedCount}件`);
  console.log(`・スキップした記事  : ${skippedCount}件`);
  console.log(`・エラーになった記事: ${errorCount}件`);
  console.log("==================================================");
}

main().catch(err => {
  console.error("致命的なエラーが発生しました:", err);
});
