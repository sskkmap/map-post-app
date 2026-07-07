/*記事生成→画像追加の自動化スクリプト。*/

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WAIT_TIME_MS = 60 * 60 * 1000; // 60分

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  
  // .env.local の絶対パスを計算 (scripts/ -> ai-story-library/.env.local)
  const envPath = path.resolve(__dirname, '../.env.local');
  
  console.log(`\n>>> [Orchestrator] 実行開始: ${scriptName}`);
  const result = spawnSync('node', [`--env-file=${envPath}`, scriptPath, '--orchestrator'], {
    stdio: 'inherit'
  });
  console.log(`<<< [Orchestrator] 終了コード: ${result.status} (${scriptName})`);
  return result.status;
}

async function main() {
  console.log("==========================================");
  console.log("=== 全自動連携オーケストレーター 起動 ===");
  console.log("==========================================\n");

  let lastBackupDate = null;

  while (true) {
    // 1. 記事生成
    const genCode = runScript('generateArticles.mjs');

    if (genCode === 99) {
      console.log(`\n[Orchestrator] 記事生成が Gemini API上限 (Rate Limit) に達しました。画像追加処理に切り替えます。`);

      // 2. 画像追加
      const imgCode = runScript('fillMissingImages.mjs');

      console.log(`\n[Orchestrator] 全ての処理が完了、または Unsplash API上限 に達しました。`);
      
      // 3. 1日1回のGitバックアップ
      const currentDate = new Date().toLocaleDateString();
      if (lastBackupDate !== currentDate) {
        console.log(`\n[Orchestrator] 1日1回のGit自動バックアップを開始します...`);
        const dateStr = new Date().toISOString().split('T')[0];
        const projectRoot = path.resolve(__dirname, '../');
        try {
          spawnSync('git', ['add', '.'], { cwd: projectRoot });
          const commitRes = spawnSync('git', ['commit', '-m', `Auto backup: ${dateStr}`], { cwd: projectRoot });
          // コミット成功時またはコミットすべき変更がない場合はpushを試みる
          if (commitRes.status === 0 || (commitRes.stdout && commitRes.stdout.toString().includes('nothing to commit'))) {
            const pushRes = spawnSync('git', ['push'], { cwd: projectRoot });
            if (pushRes.status === 0) {
              console.log(`[Orchestrator] Gitへのバックアップが完了しました！`);
            } else {
              console.log(`[Orchestrator] Git pushに失敗したか、リモートに変更がありませんでした。`);
            }
          } else {
            console.log(`[Orchestrator] バックアップする変更がありませんでした。`);
          }
          lastBackupDate = currentDate; // バックアップ実行日を更新
        } catch (err) {
          console.error(`[Orchestrator] Gitバックアップ中にエラーが発生しました:`, err.message);
        }
      }
      console.log(`[Orchestrator] 60分間の待機モードに入ります... (再開予定: ${new Date(Date.now() + WAIT_TIME_MS).toLocaleTimeString()})`);

      // 10分おきにログを出しながら待機
      for (let i = 0; i < 6; i++) {
        await sleep(10 * 60 * 1000);
        console.log(`...待機中... 残り約 ${60 - (i + 1) * 10} 分`);
      }

      console.log(`\n[Orchestrator] 待機完了。ループを再開します。`);
    } else if (genCode !== 0) {
      console.error(`\n[Orchestrator] 記事生成スクリプトがエラーコード ${genCode} で終了しました。`);
      console.log(`[Orchestrator] 予期せぬエラーのため、60分間の待機モードに入ります...`);
      for (let i = 0; i < 6; i++) {
        await sleep(10 * 60 * 1000);
        console.log(`...エラー待機中... 残り約 ${60 - (i + 1) * 10} 分`);
      }
      console.log(`\n[Orchestrator] 待機完了。ループを再開します。`);
    } else {
      console.log(`\n[Orchestrator] 記事生成が1周正常に完了しました。休むことなく次の周回を開始します。`);
      // すぐに次のループ（generateArticles）へ
      await sleep(5000); // 念のため5秒だけ待機して連続実行
    }
  }
}

main().catch(err => {
  console.error("オーケストレーターで致命的なエラー:", err);
  process.exit(1);
});
