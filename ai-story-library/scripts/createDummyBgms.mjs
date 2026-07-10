import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BGM_MAP_FILE = path.resolve(__dirname, '../src/data/bgmMap.json');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

async function main() {
  if (!fs.existsSync(BGM_MAP_FILE)) {
    console.error(`BGM map file not found: ${BGM_MAP_FILE}`);
    return;
  }

  const bgmMap = JSON.parse(fs.readFileSync(BGM_MAP_FILE, 'utf-8'));
  console.log('Generating dummy BGM files...');

  for (const [genre, files] of Object.entries(bgmMap)) {
    if (genre === 'common') continue;

    for (const relativeUrl of files) {
      // Decode URL, e.g. %E3%82%86%E3%81%A3%E3%81%9F%E3%82%8A -> ゆったり
      const decodedPath = decodeURIComponent(relativeUrl);
      const absolutePath = path.join(PUBLIC_DIR, decodedPath);

      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(absolutePath)) {
        console.log(`[Skip] Already exists: ${decodedPath}`);
        continue;
      }

      console.log(`[Generate] Creating silent BGM: ${decodedPath}`);

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input('anullsrc=r=44100:cl=stereo')
          .inputFormat('lavfi')
          .duration(5)
          .audioCodec('libmp3lame')
          .on('end', () => {
            console.log(`  ✓ Successfully generated ${decodedPath}`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`  ✗ Failed to generate ${decodedPath}:`, err);
            reject(err);
          })
          .save(absolutePath);
      });
    }
  }

  console.log('✓ All dummy BGM files generated successfully!');
}

main().catch(console.error);
