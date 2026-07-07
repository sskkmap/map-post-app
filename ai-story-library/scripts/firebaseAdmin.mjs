// 【稼働中・必須】Firebase Admin SDKを初期化するためのヘルパースクリプト。バックエンドでのFirebase操作に必要。
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

let app;

export function getFirebaseAdmin() {
  if (app) return app;
  
  // 既に初期化されている場合はそれを返す
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // .envファイル内の改行文字(\n)を実際の改行に変換する処理
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('.env.local に Firebase Admin 用の環境変数 (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) が設定されていません。');
  }

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: bucketName
  });

  return app;
}

export function getBucket() {
  return getStorage(getFirebaseAdmin()).bucket();
}
