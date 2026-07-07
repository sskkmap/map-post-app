import fs from 'fs';
import path from 'path';

const bgmBaseDir = path.join(process.cwd(), 'public', 'audio', 'bgm');
const outputFile = path.join(process.cwd(), 'src', 'data', 'bgmMap.json');

const bgmMap = { common: [] };

try {
  if (fs.existsSync(bgmBaseDir)) {
    const folders = fs.readdirSync(bgmBaseDir, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const genre = folder.name;
        const files = fs.readdirSync(path.join(bgmBaseDir, genre)).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
        bgmMap[genre] = files.map(f => `/audio/bgm/${genre}/${encodeURIComponent(f)}`);
      }
    }
  }
  
  // Ensure the data directory exists
  const dataDir = path.dirname(outputFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(bgmMap, null, 2));
  console.log(`BGM map generated successfully at ${outputFile}`);
} catch (e) {
  console.error("Failed to generate BGM map:", e);
}
