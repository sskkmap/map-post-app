import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1200x630の青いダミー画像のbase64
// 実際の画像は後で置き換えてください。
const base64Image = "iVBORw0KGgoAAAANSUhEUgAABLAAAAJ6AQMAAAA/Jb1vAAAAA1BMVEUAAwTzE0v1AAAAyElEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAvwGAoAAB4P0UjAAAAABJRU5ErkJggg==";

const imageBuffer = Buffer.from(base64Image, 'base64');
const outputPath = path.join(__dirname, 'public', 'og-image.png');

fs.writeFileSync(outputPath, imageBuffer);
console.log('Dummy og-image.png generated successfully at:', outputPath);
