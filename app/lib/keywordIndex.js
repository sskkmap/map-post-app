// 自動リンク化したいキーワードと、そのリンク先となる代表記事のスラッグ（URLの末尾）を定義します
// このファイルは自動生成および精査されたものです。
/*
export const keywordIndex = {
    // 例：このように「キーワード」と「アフィリエイトURL」を登録します
    "長谷川式テスト用紙": "https://amzn.to/example_affiliate_link",
    "おすすめ聴診器": "https://px.a8.net/example_affiliate_link",

    // 通常の医療キーワード（内部リンク）もそのまま混在して大丈夫です
    "Kellgren-Lawrence分類": "kellgren-lawrence-classification",
    "Nohria-Stevenson分類": "nohria-stevenson-classification-heart-failure",
    // （以下略）
};*/



export const keywordIndex = {
    "Kellgren-Lawrence分類": "kellgren-lawrence-classification",
    "Nohria-Stevenson分類": "nohria-stevenson-classification-heart-failure",
    "Hunt and Kosnik分類": "hunt-kosnik-sa-grading",
    "CHA2DS2-VAScスコア": "cha2ds2-vasc-score-anticoagulation",
    "Hunt and Hess分類": "hunt-and-hess-classification",
    "Steinbrocker分類": "steinbrocker-classification-ra",
    "Child-Pugh分類": "child-pugh-score-for-pharmacists",
    "グラスゴーコーマスケール": "gcs-clinical-evaluation",
    "Hoehn＆Yahr分類": "hoehn-yahr-staging-parkinsons",
    "Hugh-Jones分類": "hugh-jones-classification-guide",
    "Mallampati分類": "mallampati-classification-guide",
    "修正アシュワーススケール": "modified-ashworth-scale-basics",
    "Rubenstein分類": "rubenstein-classification-pacemaker",
    "Rutherford分類": "rutherford-classification-pad",
    "Sunderland分類": "sunderland-classification-nerve-injury",
    "Alvaradoスコア": "alvarado-score-appendicitis",
    "Braunwald分類": "braunwald-classification-explanation",
    "Forrester分類": "forrester-classification-pharmacist",
    "GRACEリスクスコア": "grace-risk-score-acs-prognosis",
    "Borrmann分類": "borrmann-classification-gastric-cancer",
    "CASPAR分類基準": "caspar-criteria-psoriatic-arthritis",
    "Fontaine分類": "fontaine-classification-pad",
    "Goligher分類": "goligher-classification-hemorrhoids",
    "MRC息切れスケール": "mrc-breathlessness-scale",
    "NCC-ST-439": "ncc-st-439-tumor-marker-explanation",
    "ショックインデックス": "shock-index-clinical-guide",
    "TIMIリスクスコア": "timi-risk-score-acs-guide",
    "Zancolli分類": "zancolli-classification-guide",
    "Beecham分類": "beecham-classification-gynecology",
    "Bishopスコア": "bishop-score-explanation",
    "CHADS2スコア": "chads2-score-af-risk-assessment",
    "Geckler分類": "geckler-classification-sputum-evaluation",
    "Kirklin分類": "kirklin-classification-heart-disease",
    "LRINECスコア": "lrinec-score-necrotizing-fasciitis",
    "修正ボルグスケール": "modified-borg-scale-exercise-intensity",
    "RomeⅣ診断基準": "rome-iv-criteria-explanation",
    "Sellers分類": "sellers-classification-explanation",
    "ALS重症度分類": "als-severity-classification",
    "DESIGN-R": "design-r-pressure-ulcer-assessment",
    "DRS-R-98": "drs-r-98-delirium-assessment",
    "フェイススケール": "face-scale-pain-assessment",
    "Fisher分類": "fisher-classification-vasospasm",
    "IOIBDスコア": "ioibd-score-explanation",
    "Killip分類": "killip-classification-mi-severity",
    "Levine分類": "levine-classification-guide",
    "Lightの基準": "lights-criteria-pleural-effusion",
    "Lugano分類": "lugano-classification-lymphoma",
    "pRIFLE基準": "prifle-criteria-pediatric-aki",
    "R-ASRM分類": "r-asrm-classification-endometriosis",
    "Sarnat分類": "sarnat-classification-hie-assessment",
    "Seddon分類": "seddon-classification-nerve-injury",
    "SIRS診断基準": "sirs-diagnostic-criteria-pharmacist",
    "Sokalスコア": "sokal-score-cml-prognosis",
    "PIVKA-II": "what-is-pivka-ii-liver-cancer",
    "アプガースコア": "apgar-score-explanation",
    "Artzの基準": "artz-criteria-burn-severity",
    "Binet分類": "binet-classification-cll",
    "CARGスコア": "carg-score-oncology-elderly",
    "Crowe分類": "crowe-classification-ddh",
    "DASC-21": "dasc-21-dementia-assessment",
    "DUPAN-2": "dupan-2-pancreatic-cancer-marker",
    "J-CHS基準": "j-chs-frailty-assessment",
    "KDIGO基準": "kdigo-aki-criteria-explanation",
    "NPUAP分類": "npuap-pressure-ulcer-classification",
    "R-ISS分類": "r-iss-classification-myeloma",
    "RIFLE基準": "rifle-criteria-aki-assessment",
    "ショックスコア": "shock-score-assessment-for-pharmacists",
    "Mayoスコア": "understanding-mayo-score-uc",
    "AKIN基準": "akin-criteria-aki-classification",
    "ASIA分類": "asia-classification-spinal-cord-injury",
    "BCA225": "bca225-tumor-marker-explanation",
    "CA15-3": "ca15-3-tumor-marker-breast-cancer",
    "CEAP分類": "ceap-classification-guide",
    "Cohn分類": "cohn-classification-heart-failure",
    "DIEPSS": "diepss-guide-for-pharmacists",
    "HIGH-R": "high-r-bipolar-assessment",
    "K式スケール": "k-scale-pressure-ulcer-assessment",
    "Lown分類": "lown-classification-arrhythmia",
    "MGFA分類": "mgfa-classification-myasthenia-gravis",
    "NMスケール": "nm-scale-dementia-assessment",
    "NYHA分類": "nyha-classification-heart-failure",
    "PaPスコア": "pap-score-palliative-care",
    "SCORAD": "scorad-atopic-dermatitis-assessment",
    "SMIスコア": "smi-score-menopause-evaluation",
    "STAS-J": "stas-j-palliative-care-assessment",
    "WFNS分類": "wfns-grading-scale-explanation",
    "CA19-9": "what-is-ca19-9",
    "CA72-4": "what-is-ca72-4",
    "WIFI分類": "wifi-classification-pad",
    "Y-BOCS": "y-bocs-evaluation-guide",
    "MADRS": "madrs-depression-scale",
    "BSABS": "bsabs-scale-explanation",
    "CA546": "ca546-breast-cancer-monitoring",
    "CA602": "ca602-tumor-marker-breast-cancer",
    "CCS分類": "ccs-classification-angina",
    "DAS28": "das28-rheumatoid-arthritis-activity",
    "HAM-A": "ham-a-hamilton-anxiety-rating-scale",
    "HDS-R": "hds-r-evaluation-guide",
    "熱中症分類": "heatstroke-classification-2015",
    "出雲スコア": "izumo-score-gerd-evaluation",
    "J-HAQ": "j-haq-rheumatoid-arthritis-assessment",
    "L-SAS": "lsas-social-anxiety-disorder",
    "HAM-D": "what-is-hamd-evaluation",
    "N-ADL": "n-adl-dementia-assessment",
    "NIHSS": "nihss-clinical-guide-pharmacist",
    "NMP22": "nmp22-bladder-cancer-screening",
    "NMSRS": "nmsrs-neuroleptic-malignant-syndrome",
    "PANSS": "panss-psychiatric-evaluation",
    "Rai分類": "rai-classification-cll",
    "SCORD": "scord-depression-assessment",
    "SOFAS": "sofas-evaluation-guide",
    "TNM分類": "tnm-classification-for-pharmacists",
    "CA125": "what-is-ca125-ovarian-cancer",
    "LASMI": "what-is-lasmi",
    "ICTP": "bone-metastasis-marker-ictp",
    "ADAS": "adas-alzheimers-scale-explained",
    "AIHA": "aiha-severity-classification",
    "AIMS": "aims-tardive-dyskinesia-assessment",
    "BACS": "bacs-schizophrenia-assessment",
    "BCRS": "bcrs-dementia-assessment",
    "BPRS": "bprs-evaluation-scale",
    "CAGE": "cage-alcohol-screening",
    "CDAI": "cdai-rheumatoid-arthritis-assessment",
    "CPRS": "cprs-clinical-psychopathological-rating-scale",
    "CPSS": "cpss-stroke-assessment-pharmacist",
    "CSDD": "csdd-dementia-depression-assessment",
    "EPDS": "epds-screening-postpartum-depression",
    "FAST": "fast-dementia-assessment",
    "HDSS": "hdss-hyperhidrosis-assessment",
    "IPOS": "ipos-palliative-care-assessment",
    "ITAQ": "itaq-assessment-tool",
    "JTAS": "jtas-emergency-triage",
    "MCHC": "mchc-hypochromic-anemia-guide",
    "SMRP": "mesothelin-malignant-mesothelioma",
    "MINI": "mini-structured-interview-for-pharmacists",
    "MMSE": "mmse-dementia-screening",
    "MUST": "must-nutritional-screening",
    "OHSS": "ohss-severity-classification",
    "PDAI": "pdai-pemphigus-severity-score",
    "PPPD": "pppd-antidepressant-pharmacotherapy",
    "PSQI": "psqi-sleep-assessment-guide",
    "RASS": "rass-sedation-assessment",
    "SANS": "sans-schizophrenia-negative-symptoms",
    "SAPS": "saps-psychiatric-scale",
    "SCID": "scid-interview-guide-for-pharmacists",
    "SDAI": "sdai-rheumatoid-arthritis-assessment",
    "SDSS": "sdss-subjective-deficit-syndrome-scale",
    "SEDS": "seds-schizophrenia-assessment",
    "SHRS": "shrs-extrapyramidal-symptoms-assessment",
    "SIAS": "sias-stroke-assessment-guide",
    "SUMD": "sumd-insight-assessment",
    "TAKE": "take-scale-for-drug-induced-movement-disorders",
    "UAS7": "uas7-urticaria-score-guide",
    "CAPS": "what-is-caps-ptsd-scale",
    "CASH": "what-is-cash-assessment",
    "DIGS": "what-is-digs-psychiatric-interview",
    "PDSS": "what-is-pdss-panic-disorder-severity-scale",
    "YMRS": "ymrs-young-mania-rating-scale",
    "JCS": "jcs-consciousness-level-assessment",
    "MMT": "mmt-manual-muscle-test-guide",
    "TPN": "tpn-fluids",
    "AFP": "afp-tumor-marker-hepatocellular-carcinoma",
    "BAS": "bas-akathisia-assessment",
    "CES": "care-evaluation-scale-pharmacist",
    "CEA": "cea-tumor-marker-explanation",
    "CGI": "cgi-scale-psychiatry-guide",
    "CDR": "clinical-dementia-rating-explained",
    "DIS": "dis-structured-clinical-interview",
    "FIM": "fim-evaluation-for-pharmacists",
    "GCS": "gcs-clinical-evaluation",
    "HE4": "he4-ovarian-cancer-marker",
    "IDS": "ids-depression-scale-guide",
    "JSS": "jss-stroke-scale-explanation",
    "MCH": "mch-interpretation-clinical-practice",
    "MCV": "mcv-anemia-classification",
    "NRS": "nrs-pain-assessment",
    "NSE": "nse-small-cell-lung-cancer",
    "VAS": "pain-assessment-vas-scale",
    "PPN": "ppn-fluids",
    "PSP": "psp-psychiatric-scale-pharmacist",
    "QLS": "qls-schizophrenia-qol",
    "RAS": "ras-aggression-assessment-pharmacist",
    "SAS": "sas-extrapyramidal-symptoms",
    "SDS": "sds-depression-scale-pharmacist",
    "SGA": "sga-nutritional-assessment",
    "SJS": "sjs-ten-severity-classification",
    "TEN": "sjs-ten-severity-classification",
    "STN": "stn-cancer-biomarker",
    "TDS": "tds-nicotine-dependence-screening",
    "UKU": "uku-side-effect-rating-scale",
    "ASI": "what-is-asi-addiction-assessment",
    "BFP": "what-is-bfp-tumor-marker",
    "DAD": "what-is-dad-dementia-assessment",
    "GAF": "what-is-gaf-scale",
    "ICF": "what-is-icf-for-pharmacists",
    "SLX": "what-is-slx-tumor-marker",
    "SRS": "what-is-srs-evaluation-scale",
    "TPA": "what-is-tpa-tumor-marker",
    "RF": "rheumatoid-factor",
    "カロナール": "acetaminophen-nsaids-explanation",
    "アセトアミノフェン": "acetaminophen-nsaids-explanation",
    "アルコール消毒": "alcohol-disinfection-concentration",
    "エタノール消毒": "alcohol-disinfection-concentration",
    "次亜塩素酸ナトリウム": "alcohol-disinfection-concentration",
};

/**
 * HTML文字列内のキーワードを自動的にリンク化する関数
 */
export function autoLinkKeywords(html, currentSlug = null, keywordMap = keywordIndex) {
    const keys = Object.keys(keywordMap);
    if (keys.length === 0) return html;

    // 最長一致させるため、文字数が長い順にソート（例: "ADAS-J cog" が "ADAS" より先にマッチするようにする）
    keys.sort((a, b) => b.length - a.length);

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = new RegExp(`(${keys.map(escapeRegExp).join('|')})`, 'g');

    let result = '';
    let inTag = false;
    let inAnchor = false;
    let buffer = '';

    const replaceCallback = (match) => {
        const slug = keywordMap[match];
        const isExternal = slug.startsWith('http://') || slug.startsWith('https://');

        // 現在のページと同じ、かつ内部リンクの場合はリンク化しない
        if (!isExternal && currentSlug && slug === currentSlug) {
            return match;
        }

        if (isExternal) {
            // アフィリエイトなどの外部URL用（新しいタブで開き、検索エンジン巡回を制御する属性を付与）
            return `<a href="${slug}" target="_blank" rel="nofollow noopener noreferrer" class="auto-keyword-link" style="text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 4px; color: hsl(var(--primary)); font-weight: 500;" title="${match}の紹介ページへ">${match}</a>`;
        } else {
            // 通常の解説記事リンク（内部リンク）
            return `<a href="/articles/${slug}" class="auto-keyword-link" style="text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 4px; color: hsl(var(--primary)); font-weight: 500;" title="${match}の解説記事へ">${match}</a>`;
        }
    };

    for (let i = 0; i < html.length; i++) {
        const char = html[i];

        if (char === '<') {
            // < に遭遇したので、これまでのテキスト（タグの外側）を処理
            if (!inTag && buffer.length > 0) {
                // aタグの中（既にリンクになっている部分）は二重リンクを避けるため除外
                if (!inAnchor) {
                    buffer = buffer.replace(regexPattern, replaceCallback);
                }
                result += buffer;
                buffer = '';
            }

            inTag = true;
            buffer += '<';

            // aタグの開始・終了を判定
            const nextTag = html.substring(i, i + 3).toLowerCase();
            const closeTag = html.substring(i, i + 4).toLowerCase();

            if (nextTag === '<a ' || nextTag === '<a>') {
                inAnchor = true;
            } else if (closeTag === '</a>') {
                inAnchor = false;
            }
        } else if (char === '>') {
            buffer += '>';
            result += buffer;
            buffer = '';
            inTag = false;
        } else {
            buffer += char;
        }
    }

    // 残りのテキストバッファを処理
    if (!inTag && buffer.length > 0) {
        if (!inAnchor) {
            buffer = buffer.replace(regexPattern, replaceCallback);
        }
        result += buffer;
    }

    return result;
}
