'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function MedicationHistorySupport() {
  const [inputDrug, setInputDrug] = useState('');
  const [normalizedDrug, setNormalizedDrug] = useState('');
  const [extractedDrugNames, setExtractedDrugNames] = useState([]);
  const [assessmentTexts, setAssessmentTexts] = useState({ diseaseCategories: [], disease: [], ingredientCategories: [], ingredient: [], common: [] });
  const [selectedTexts, setSelectedTexts] = useState([]);
  const [finalAssessment, setFinalAssessment] = useState('');

  // CSVデータを格納
  const [normalizationDict, setNormalizationDict] = useState([]);
  const [masterDrugs, setMasterDrugs] = useState([]);
  const [diseaseCodeList, setDiseaseCodeList] = useState([]);
  const [ingredientCodeList, setIngredientCodeList] = useState([]);
  const [commonList, setCommonList] = useState([]);

  const extractDrugNamesFromText = (input) => {
    if (!input) return [];
    const segments = input
      .replace(/\u3000/g, ' ')
      .split(/[\n\r,；;、]+/)
      .map(segment => segment.trim())
      .filter(Boolean);

    const normalizedSet = new Set();

    const dictEntries = normalizationDict
      .filter(item => item['変換前(商品名/誤字)'])
      .map(item => ({
        key: item['変換前(商品名/誤字)'],
        value: item['変換後(成分名)'],
      }))
      .sort((a, b) => b.key.length - a.key.length);

    const masterProductEntries = masterDrugs
      .filter(item => item['商品名'])
      .map(item => ({
        key: item['商品名'],
        value: item['成分名'],
      }))
      .sort((a, b) => b.key.length - a.key.length);

    const masterIngredientEntries = masterDrugs
      .filter(item => item['成分名'])
      .map(item => ({
        key: item['成分名'],
        value: item['成分名'],
      }))
      .sort((a, b) => b.key.length - a.key.length);

    const cleanSegment = (segment) => {
      return segment
        .replace(/Ｒｐ\s*\d+）|Rp\s*\d+\)|Rｐ\s*\d+\)|ｒｐ\s*\d+）/gi, '')
        .replace(/[()（）]/g, ' ')
        .replace(/[0-9０-９]+(?:\.?[0-9０-９]+)?\s*(mg|㎎|ｍｇ|mL|ｍL|ｍl|錠|包|回|日|週間|月|日の|週|錠|ｶﾌﾟｾﾙ|カプセル)/gi, '')
        .replace(/(１日|1日|１回|1回|１回目|1回目|朝|昼|夕|就寝前|寝る前|朝食後|昼食後|夕食後|毎日|毎朝|毎夕|毎晩|毎食後)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    segments.forEach((segment) => {
      const segmentText = cleanSegment(segment);
      if (!segmentText) return;

      const dictMatch = dictEntries.find(entry => segmentText.includes(entry.key));
      if (dictMatch) {
        normalizedSet.add(dictMatch.value);
        return;
      }

      const productMatch = masterProductEntries.find(entry => segmentText.includes(entry.key));
      if (productMatch) {
        normalizedSet.add(productMatch.value);
        return;
      }

      const ingredientMatch = masterIngredientEntries.find(entry => segmentText.includes(entry.key));
      if (ingredientMatch) {
        normalizedSet.add(ingredientMatch.value);
        return;
      }

      const cleaned = cleanSegment(segmentText);
      if (cleaned && cleaned !== segmentText) {
        const dictMatch2 = dictEntries.find(entry => cleaned.includes(entry.key));
        if (dictMatch2) {
          normalizedSet.add(dictMatch2.value);
          return;
        }

        const productMatch2 = masterProductEntries.find(entry => cleaned.includes(entry.key));
        if (productMatch2) {
          normalizedSet.add(productMatch2.value);
          return;
        }

        const ingredientMatch2 = masterIngredientEntries.find(entry => cleaned.includes(entry.key));
        if (ingredientMatch2) {
          normalizedSet.add(ingredientMatch2.value);
          return;
        }
      }
    });

    return [...normalizedSet];
  };

  const normalizeDrug = (drugName) => {
    const entry = normalizationDict.find(item => item['変換前(商品名/誤字)'] === drugName);
    return entry ? entry['変換後(成分名)'] : drugName;
  };

  const findMasterRows = (drugName) => {
    if (!drugName) return [];
    const byProduct = masterDrugs.filter(item => item['商品名']?.includes(drugName));
    if (byProduct.length > 0) return byProduct;

    const normalized = normalizeDrug(drugName);
    return masterDrugs.filter(item => item['成分名']?.includes(normalized));
  };

  const getUniqueMasterValues = (rows) => {
    return {
      drugCodes: [...new Set(rows.map(item => item['薬効分類コード']).filter(Boolean))],
      ingredientGroups: [...new Set(rows.map(item => item['成分グループ']).filter(Boolean))],
    };
  };

  const flattenTexts = (texts) => {
    return [...new Set(
      texts
        .flatMap(text => text ? text.split('｜') : [])
        .map(text => text.trim())
        .filter(Boolean)
    )];
  };
  // CSVを読み込む関数
  const loadCSV = async (path) => {
    const response = await fetch(path);
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        complete: (results) => resolve(results.data),
        error: reject,
      });
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const normDict = await loadCSV('/data/medication-hostory-support-tool/normalization_dictionary.csv');
        setNormalizationDict(normDict);

        const master = await loadCSV('/data/medication-hostory-support-tool/master_drugs.csv');
        setMasterDrugs(master);

        const disease = await loadCSV('/data/medication-hostory-support-tool/assessment_code_lists_updated_disease_code.csv');
        setDiseaseCodeList(disease);

        const ingredient = await loadCSV('/data/medication-hostory-support-tool/assessment_code_lists_updated_ingredient_code.csv');
        setIngredientCodeList(ingredient);

        const common = await loadCSV('/data/medication-hostory-support-tool/assessment_code_lists_updated_common.csv');
        setCommonList(common);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    loadData();
  }, []);

  // 服薬指導文章を検索
  const searchAssessmentTexts = (masterRows) => {
    const { drugCodes, ingredientGroups } = getUniqueMasterValues(masterRows);

    const diseaseEntries = diseaseCodeList.filter(item => drugCodes.includes(item['薬効分類コード']));
    const diseaseCategories = [...new Set(diseaseEntries.map(item => item['意味']).filter(Boolean))];
    const diseaseTexts = flattenTexts(diseaseEntries.map(item => item['服薬指導文章']));

    const ingredientEntries = ingredientCodeList.filter(item => ingredientGroups.some(group => item['成分コード']?.startsWith(group)));
    const ingredientCategories = [...new Set(ingredientEntries.map(item => item['意味']).filter(Boolean))];
    const ingredientTexts = flattenTexts(ingredientEntries.map(item => item['服薬指導文章']));

    const commonTexts = flattenTexts(commonList.map(item => item['意味']));

    return {
      diseaseCategories,
      disease: diseaseTexts,
      ingredientCategories,
      ingredient: ingredientTexts,
      common: commonTexts,
    };
  };

  const handleInputChange = (e) => {
    setInputDrug(e.target.value);
  };

  const handleSearch = () => {
    const extracted = extractDrugNamesFromText(inputDrug);
    if (extracted.length === 0) {
      setAssessmentTexts({ diseaseCategories: [], disease: [], ingredientCategories: [], ingredient: [], common: [] });
      setExtractedDrugNames([]);
      setNormalizedDrug('');
      setSelectedTexts([]);
      return;
    }

    setExtractedDrugNames(extracted);
    const matchedRows = extracted.flatMap(name => findMasterRows(name));
    const normalized = extracted.join('、');
    setNormalizedDrug(normalized);

    const rowsToSearch = matchedRows.length > 0
      ? matchedRows
      : extracted.flatMap(name => masterDrugs.filter(row => row['成分名']?.includes(normalizeDrug(name))));

    const texts = searchAssessmentTexts(rowsToSearch);
    setAssessmentTexts(texts);

    const firstText = texts.disease[0] || texts.ingredient[0] || texts.common[0] || '';
    if (firstText) {
      setSelectedTexts([firstText]);
    } else {
      setSelectedTexts([]);
    }
  };


  // selectedTexts が変わったらリアルタイムでアセスメント更新
  useEffect(() => {
    if (selectedTexts.length > 0) {
      const assessment = selectedTexts.join('｜');
      setFinalAssessment(assessment);
      navigator.clipboard.writeText(assessment).catch(err => console.error('コピー失敗:', err));
    }
  }, [selectedTexts]);

  const handleSelectText = (text) => {
    if (selectedTexts.includes(text)) {
      setSelectedTexts(selectedTexts.filter(t => t !== text));
    } else {
      setSelectedTexts([...selectedTexts, text]);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">薬歴サポートツール</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">薬の名前を入力:</label>
        <input
          type="text"
          value={inputDrug}
          onChange={handleInputChange}
          className="border border-gray-300 rounded px-3 py-2 w-full"
          placeholder="例: アムロジピン5mgサワイ"
        />
        <button
          onClick={handleSearch}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          検索
        </button>
      </div>

      {normalizedDrug && (
        <div className="mb-4">
          <p>一般化された薬: {normalizedDrug}</p>
        </div>
      )}

      {extractedDrugNames.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">抽出された薬剤:</h2>
          <div className="flex flex-wrap gap-2">
            {extractedDrugNames.map((name, index) => (
              <span key={`extracted-${index}`} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md text-sm">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {(assessmentTexts.diseaseCategories.length > 0 || assessmentTexts.ingredientCategories.length > 0 || assessmentTexts.common.length > 0) && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">検索結果:</h2>

          {assessmentTexts.diseaseCategories.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold">疾患カテゴリ:</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {assessmentTexts.diseaseCategories.map((category, index) => (
                  <span key={`disease-cat-${index}`} className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-md text-sm">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {assessmentTexts.ingredientCategories.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold">成分カテゴリ:</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {assessmentTexts.ingredientCategories.map((category, index) => (
                  <span key={`ingredient-cat-${index}`} className="bg-sky-100 text-sky-900 px-3 py-1 rounded-md text-sm">
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {assessmentTexts.common.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold">共通項目:</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {assessmentTexts.common.map((text, index) => (
                  <span key={`common-cat-${index}`} className="bg-amber-100 text-amber-900 px-3 py-1 rounded-md text-sm">
                    {text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {assessmentTexts.disease.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold">疾患に基づく候補文章:</h3>
              <ul className="space-y-2 mt-2">
                {assessmentTexts.disease.map((text, index) => (
                  <li key={`disease-${index}`} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTexts.includes(text)}
                      onChange={() => handleSelectText(text)}
                      className="mr-2"
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assessmentTexts.ingredient.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold">成分に基づく候補文章:</h3>
              <ul className="space-y-2 mt-2">
                {assessmentTexts.ingredient.map((text, index) => (
                  <li key={`ingredient-${index}`} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTexts.includes(text)}
                      onChange={() => handleSelectText(text)}
                      className="mr-2"
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assessmentTexts.common.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold">共通項目候補文章:</h3>
              <ul className="space-y-2 mt-2">
                {assessmentTexts.common.map((text, index) => (
                  <li key={`common-${index}`} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTexts.includes(text)}
                      onChange={() => handleSelectText(text)}
                      className="mr-2"
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {finalAssessment && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">生成されたアセスメント:</h2>
          <textarea
            value={finalAssessment}
            onChange={(e) => setFinalAssessment(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full h-32"
          />
          <button
            onClick={() => navigator.clipboard.writeText(finalAssessment)}
            className="mt-2 bg-gray-500 text-white px-4 py-2 rounded"
          >
            クリップボードへコピー
          </button>
        </div>
      )}
    </div>
  );
}