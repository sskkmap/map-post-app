// 【必須】これは音声(WAV)をMP3に変換し、Firebaseにアップロードするための重要なヘルパースクリプトです。
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs/promises';
import { getBucket } from './firebaseAdmin.mjs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * WAVをMP3に変換する
 */
export function convertWavToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

/**
 * Firebase Storage にファイルをアップロードして公開URLを返す
 */
export async function uploadAudioToFirebase(localFilePath, destinationPath) {
  const bucket = getBucket();

  console.log(`  [Firebase] アップロード開始: ${destinationPath}`);

  await bucket.upload(localFilePath, {
    destination: destinationPath,
    metadata: {
      contentType: 'audio/mpeg',
    }
  });

  const file = bucket.file(destinationPath);
  await file.makePublic(); // 公開設定にしてURLから誰でも再生できるようにする

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  console.log(`  [Firebase] アップロード完了: ${publicUrl}`);

  return publicUrl;
}
