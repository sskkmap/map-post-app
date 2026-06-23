import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(process.cwd(), 'data-articles');
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

// 除外する一般的すぎる言葉・血液検査値・製剤区分（自動リンクだらけになり誤認を招くのを防ぐ）
const strictExcludes = new Set([
    // 血液検査項目・一般的な生化学指標
    'GOT', 'GPT', 'AST', 'ALT', 'BUN', 'WBC', 'RBC', 'Plt', 'ALP', 'LDH', 'TG', 'BS', 'GLU', 'HbA1c', 'CrCl', 'CCr', 'CRP',
    // 一般的な医学・看護概念
    'ICU', 'TDM', 'ADL', 'IADL', 'BMI', 'ORS', 'IV', 'GI', 'PTSD', 'ALS', 'APL', 'APG', 'BCA', 'COPD', 'AKI', 'GERD', 'IBD', 'ACS', 'PAD', 'CLL', 'MI', 'RA',
    // 薬剤の分類・剤形
    'OD', 'OTC', 'DOAC', 'NSAIDs', 'ACEI', 'ARB', 'GLP1', 'DPP4', 'PPI', 'P-CAB', 'SSRI', 'SNRI',
    // 1文字アルファベット
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    // 一般的な機関
    'FDA', 'MHLW', 'PMDA', 'MR',
    // 一般的な日本語（リンクだらけになりやすいもの）
    '重症度判定基準', '熱傷重症度判定', '呼吸困難評価', '脳死判定基準', 'フレイル評価', '日常生活動作評価',
    '身体機能評価', '脳卒中重症度スケール', '認知症重症度評価', '熱傷面積評価', '妊娠リスクスコア', '新国際病期分類',
    '機能障害評価', '在宅版K式スケール', 'アウトカム評価', '厚労省研究班基準', '厚労省研究班分類', '認知症'
]);

// 手動でコンフリクトを解決するための優先マッピング
const manualMappings = {
    'JCS': 'jcs-consciousness-level-assessment',
    'MADRS': 'madrs-depression-scale',
    'MMT': 'mmt-manual-muscle-test-guide',
    'ICTP': 'bone-metastasis-marker-ictp',
    'TPN': 'tpn-fluids'
};

const keywordMap = {};

files.forEach(file => {
    const slug = file.replace('.md', '');
    const content = fs.readFileSync(path.join(articlesDir, file), 'utf-8');

    // titleとtagsを抽出
    const titleMatch = content.match(/title:\s*"(.*?)"/);
    const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
    
    if (titleMatch) {
        const title = titleMatch[1];
        const tags = tagsMatch && tagsMatch[1] 
            ? tagsMatch[1].split(',').map(t => t.replace(/['"]/g, '').trim()).filter(t => t)
            : [];

        tags.forEach((tag, idx) => {
            const cleanTag = tag.trim();
            
            // 除外リストに該当する場合はスキップ
            if (strictExcludes.has(cleanTag)) {
                return;
            }

            // 1. アルファベット略語 (ADAS, MMSE, HDS-R, DASC-21, etc.)
            const isEnglishAbbr = /^[A-Z][A-Z0-9\-\/&'+\s]{1,19}$/.test(cleanTag) && !cleanTag.includes(' ');
            
            // 2. 日本語の具体的なスケール名や分類名
            const isJapaneseScale = cleanTag.length >= 5 && 
                /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanTag) &&
                /(スケール|分類|スコア|基準|インデックス|指標)$/.test(cleanTag) &&
                title.includes(cleanTag);

            if (isEnglishAbbr || isJapaneseScale) {
                const isFirstTag = idx === 0;
                const inTitle = title.toUpperCase().includes(cleanTag.toUpperCase());
                
                if (isFirstTag || inTitle) {
                    if (!keywordMap[cleanTag]) {
                        keywordMap[cleanTag] = [];
                    }
                    keywordMap[cleanTag].push({ slug, title, isFirstTag, inTitle });
                }
            }
        });
    }
});

// 最終決定
const finalIndex = {};

// 1. 手動マッピングを登録
Object.keys(manualMappings).forEach(tag => {
    finalIndex[tag] = manualMappings[tag];
});

// 2. 自動抽出結果の精査
Object.keys(keywordMap).forEach(tag => {
    if (finalIndex[tag]) return;

    const list = keywordMap[tag];
    
    if (list.length === 1) {
        finalIndex[tag] = list[0].slug;
    } else {
        const bestMatches = list.filter(item => item.isFirstTag && item.inTitle);
        if (bestMatches.length === 1) {
            finalIndex[tag] = bestMatches[0].slug;
        } else {
            const firstTags = list.filter(item => item.isFirstTag);
            if (firstTags.length === 1) {
                finalIndex[tag] = firstTags[0].slug;
            } else {
                const titleMatches = list.filter(item => item.inTitle);
                if (titleMatches.length === 1) {
                    finalIndex[tag] = titleMatches[0].slug;
                }
            }
        }
    }
});

const targetFilePath = path.join(process.cwd(), 'app', 'lib', 'keywordIndex.js');
const originalContent = fs.existsSync(targetFilePath) ? fs.readFileSync(targetFilePath, 'utf-8') : '';

// 既存のファイルから手動登録された外部URL（http/https）を抽出して保護します
const externalLinks = {};
if (originalContent) {
    const extLinkRegex = /"([^"]+)"\s*:\s*"(https?:\/\/[^"]+)"/g;
    let match;
    while ((match = extLinkRegex.exec(originalContent)) !== null) {
        externalLinks[match[1]] = match[2];
    }
}

// 抽出した外部リンクをマージします
Object.keys(externalLinks).forEach(key => {
    finalIndex[key] = externalLinks[key];
});

// JavaScriptファイル形式で書き出し用のテキストを作成
let fileContent = `// 自動リンク化したいキーワードと、そのリンク先となる代表記事のスラッグ（URLの末尾）を定義します
// このファイルは自動生成および精査されたものです。

export const keywordIndex = {
`;

// キーワード文字列の長さ順にソート（最長一致マッチングのため重要）
const sortedKeys = Object.keys(finalIndex).sort((a, b) => b.length - a.length);

sortedKeys.forEach(key => {
    fileContent += `    "${key}": "${finalIndex[key]}",\n`;
});

fileContent += `};
`;

// `export function autoLinkKeywords` 以降のコードを抽出
const autoLinkFuncStartIdx = originalContent.indexOf('/**\n * HTML文字列内のキーワードを自動的にリンク化する関数');
if (autoLinkFuncStartIdx !== -1) {
    const autoLinkFuncCode = originalContent.substring(autoLinkFuncStartIdx);
    fileContent += '\n' + autoLinkFuncCode;
} else {
    console.error('Could not find autoLinkKeywords function in original file!');
}

fs.writeFileSync(targetFilePath, fileContent);
console.log(`Successfully generated keywordIndex.js with ${sortedKeys.length} curated keywords.`);
