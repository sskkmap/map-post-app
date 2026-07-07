// ここに禁止したいキーワード（NGワード）を追加します
export const NG_WORDS = [
  // 暴言・誹謗中傷
  "死ね",
  "殺す",
  "馬鹿",
  "アホ",
  "クソ",
  "ガイジ",
  "キチガイ",
  "カス",
  "ゴミ",
  "基地外",
  "池沼",

  // アダルト・出会い系
  "出会い系",
  "アダルト",
  "エロ",
  "パパ活",
  "ママ活",
  "援助交際",
  "援交",
  "風俗",
  "裏アカ",
  "セックス",
  "オナニー",

  // 詐欺・スパム・犯罪教唆
  "スパム",
  "簡単に稼げる",
  "必ず儲かる",
  "絶対勝てる",
  "副業で月収",
  "マルチ商法",
  "ネズミ講",
  "情報商材",
  "爆破予告",
  "殺害予告",
  "犯行予告",
  "大麻",
  "覚せい剤",
  "麻薬",

  // 差別用語
  "チョン",
  "チャンコロ",
  "土人",
  "部落",
  "穢多",
  "非人",

  // 英語のNGワード（Profanity, Slurs, Spam）
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "faggot",
  "slut",
  "whore",
  "porn",
  "blowjob",
  "nsfw",
  "viagra",
  "free money",
  "casino"
];

// チェック用の文字列正規化
// 1. NFKCで全角英数字や半角カナを統一
// 2. 小文字化
// 3. 空白や一部の記号を取り除き、「死　ね」「エ・ロ」などのすり抜けを防ぐ
function normalizeForCheck(text: string): string {
  if (!text) return "";
  let normalized = text.normalize("NFKC").toLowerCase();
  // 空白文字全般、中点、カンマ、ピリオド、アンダースコア、ハイフンなどの除去
  normalized = normalized.replace(/[\s　・.,_－-]/g, "");
  return normalized;
}

export function containsNgWords(text: string): boolean {
  if (!text) return false;
  const normalizedText = normalizeForCheck(text);
  return NG_WORDS.some(word => normalizedText.includes(word.toLowerCase()));
}

export function getNgWordsUsed(text: string): string[] {
  if (!text) return [];
  const normalizedText = normalizeForCheck(text);
  return NG_WORDS.filter(word => normalizedText.includes(word.toLowerCase()));
}
