"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Simple CSV parser that handles quotes
function parseCSV(text) {
  const result = [];
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return result;

  const parseLine = (line) => {
    const row = [];
    let insideQuote = false;
    let currentValue = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    row.push(currentValue);
    return row;
  };

  const headers = parseLine(lines[0].trim());

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseLine(line);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    result.push(obj);
  }

  return result;
}

export default function KampoSearch() {
  const resultsRef = useRef(null);

  const [kampoData, setKampoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhysical, setSelectedPhysical] = useState([]);
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [selectedIndications, setSelectedIndications] = useState([]);
  const [selectedCrudeDrugs, setSelectedCrudeDrugs] = useState([]);
  const [selectedClassification, setSelectedClassification] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/kampo.csv?t=' + new Date().getTime()); // cache busting
        if (!response.ok) {
          throw new Error('CSVファイルが見つかりません。');
        }
        const text = await response.text();
        const parsedData = parseCSV(text);
        setKampoData(parsedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to extract unique values
  const getUniqueValues = (key) => {
    const set = new Set();
    kampoData.forEach(item => {
      if (item[key]) {
        item[key].split('|').forEach(val => {
          const trimmed = val.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  };

  const allPhysical = useMemo(() => getUniqueValues('Physical'), [kampoData]);
  const allPatterns = useMemo(() => getUniqueValues('patterns'), [kampoData]);
  const allIndications = useMemo(() => getUniqueValues('indications'), [kampoData]);
  const allCrudeDrugs = useMemo(() => getUniqueValues('crude_drugs'), [kampoData]);
  const allClassification = useMemo(() => getUniqueValues('classification'), [kampoData]);

  // Filtering logic
  const filteredData = useMemo(() => {
    return kampoData.filter(item => {
      // 1. Keyword search (All fields)
      const searchLower = searchQuery.toLowerCase();
      const keywordMatch = !searchQuery ||
        item.name?.toLowerCase().includes(searchLower) ||
        item.name_kana?.toLowerCase().includes(searchLower) ||
        item.kampo_number?.toString() === searchLower ||
        item.Physical?.toLowerCase().includes(searchLower) ||
        item.indications?.toLowerCase().includes(searchLower) ||
        item.patterns?.toLowerCase().includes(searchLower) ||
        item.classification?.toLowerCase().includes(searchLower) ||
        item.crude_drugs?.toLowerCase().includes(searchLower) ||
        item.symptoms?.toLowerCase().includes(searchLower) ||
        item.point?.toLowerCase().includes(searchLower);

      // Helper for AND matching
      const isMatch = (itemValStr, selectedArray) => {
        if (selectedArray.length === 0) return true;
        const itemArray = itemValStr ? itemValStr.split('|').map(s => s.trim()) : [];
        return selectedArray.every(target => itemArray.includes(target));
      };

      const physicalMatch = isMatch(item.Physical, selectedPhysical);
      const patternsMatch = isMatch(item.patterns, selectedPatterns);
      const indicationsMatch = isMatch(item.indications, selectedIndications);
      const crudeDrugsMatch = isMatch(item.crude_drugs, selectedCrudeDrugs);
      const classificationMatch = isMatch(item.classification, selectedClassification);

      return keywordMatch && physicalMatch && patternsMatch && indicationsMatch && crudeDrugsMatch && classificationMatch;
    });
  }, [kampoData, searchQuery, selectedPhysical, selectedPatterns, selectedIndications, selectedCrudeDrugs, selectedClassification]);

  const toggleTag = (setter, tag) => {
    setter(prev => prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]);
  };

  const resetFilters = () => {
    setSearchText("");
    setSearchQuery("");
    setSelectedPhysical([]);
    setSelectedPatterns([]);
    setSelectedIndications([]);
    setSelectedCrudeDrugs([]);
    setSelectedClassification([]);
  };

  const handleSearch = () => {
    setSearchQuery(searchText);
    setTimeout(() => {
      if (resultsRef.current) {
        const yOffset = -80; // Offset for fixed header
        const y = resultsRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const getPhysicalStyle = (physicalText) => {
    if (!physicalText) return {};
    let bg = 'hsl(var(--accent))';
    let color = 'hsl(var(--accent-foreground))';

    if (physicalText.includes('充実')) {
      bg = '#fee2e2'; color = '#b91c1c'; // Red
    } else if (physicalText.includes('比較的体力のある') || physicalText.includes('比較的体力ある')) {
      bg = '#ffedd5'; color = '#c2410c'; // Orange
    } else if (physicalText.includes('中等度')) {
      bg = '#dcfce7'; color = '#15803d'; // Green
    } else if (physicalText.includes('比較的体力低下')) {
      bg = '#e0f2fe'; color = '#0369a1'; // Light Blue
    } else if (physicalText.includes('低下') || physicalText.includes('虚弱')) {
      bg = '#ede9fe'; color = '#6d28d9'; // Purple
    } else if (physicalText.includes('問わない')) {
      bg = '#f8fafc'; color = '#475569'; // Slate, light border
      return { background: bg, color: color, border: '1px solid #cbd5e1', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' };
    }

    return { background: bg, color: color, padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' };
  };

  const getKampoStyle = (kampoNumber) => {
    if (!kampoNumber) return { bg: 'hsl(var(--primary))', text: '#fff' };
    const numStr = kampoNumber.toString();
    const match = numStr.match(/\d+$/);
    if (!match) return { bg: 'hsl(var(--primary))', text: '#fff' };
    const lastDigit = parseInt(numStr.slice(-1), 10);
    switch (lastDigit) {
      case 1: return { bg: '#0ea5e9', text: '#fff' };     // 水色
      case 2: return { bg: '#22c55e', text: '#fff' };     // 緑色
      case 3: return { bg: '#84cc16', text: '#fff' };     // 黄緑色
      case 4: return { bg: '#facc15', text: '#3f3f46' };  // 黄色
      case 5: return { bg: '#f97316', text: '#fff' };     // オレンジ色
      case 6: return { bg: '#e7e5e4', text: '#3f3f46' };  // ベージュ色
      case 7: return { bg: '#78350f', text: '#fff' };     // 茶色
      case 8: return { bg: '#ef4444', text: '#fff' };     // 赤色
      case 9: return { bg: '#f472b6', text: '#fff' };     // ピンク色
      case 0: return { bg: '#1e3a8a', text: '#fff' };     // 濃紺色
      default: return { bg: 'hsl(var(--primary))', text: '#fff' };
    }
  };

  const renderPatternMatrix = (itemPatternsStr) => {
    if (!itemPatternsStr) return null;
    const patterns = itemPatternsStr.split('|').map(s => s.trim());
    const has = (keyword1, keyword2) => patterns.includes(keyword1) || (keyword2 && patterns.includes(keyword2));

    const getCellColors = (label) => {
      if (label === '実証') return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      if (label === '中間証') return { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' };
      if (label === '虚証') return { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };

      if (label.includes('熱')) return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' };
      if (label.includes('寒')) return { bg: '#cffafe', text: '#0891b2', border: '#67e8f9' };

      // Qi (気)
      if (label.includes('気')) return { bg: '#fef08a', text: '#a16207', border: '#fde047' };
      // Blood (血)
      if (label.includes('血') || label.includes('瘀')) return { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' };
      // Water (水/陰)
      if (label.includes('水') || label.includes('陰')) return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };

      return { bg: 'hsl(var(--primary) / 0.15)', text: 'hsl(var(--primary))', border: 'hsl(var(--primary) / 0.5)' };
    };

    const Cell = ({ label, alt }) => {
      const active = has(label, alt);
      const colors = getCellColors(label);
      return (
        <div style={{
          padding: '0.4rem 0.2rem',
          textAlign: 'center',
          borderRadius: '4px',
          backgroundColor: active ? colors.bg : '#f8fafc',
          color: active ? colors.text : '#94a3b8',
          fontWeight: active ? 'bold' : 'normal',
          border: `1px solid ${active ? colors.border : '#e2e8f0'}`,
          fontSize: '0.8rem',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          wordBreak: 'keep-all',
          letterSpacing: '-0.03em'
        }}>
          {label}
        </div>
      );
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem', marginTop: '0.3rem' }}>
        <Cell label="実証" />
        <Cell label="熱証" alt="熱症" />
        <Cell label="気虚" />
        <Cell label="気滞" />

        <Cell label="中間証" />
        <div style={{ backgroundColor: '#f1f5f9', borderRadius: '4px' }}></div> {/* blank */}
        <Cell label="瘀血" />
        <Cell label="血虚" />

        <Cell label="虚証" />
        <Cell label="寒証" alt="寒症" />
        <Cell label="陰虚" />
        <Cell label="水滞" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  if (error || kampoData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'hsl(var(--destructive))' }}>
        <h3 style={{ color: 'hsl(var(--destructive))', marginBottom: '1rem' }}>データがありません</h3>
        <p style={{ marginBottom: '1rem' }}>現在データ準備中です。</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>管理者が <code>/public/data/kampo.csv</code> をアップロードすると検索できるようになります。</p>
      </div>
    );
  }

  const renderTagGroup = (title, allTags, selectedTags, setter, isOpen = true) => {
    if (allTags.length === 0) return null;
    return (
      <details style={{ marginBottom: '1rem', background: 'hsl(var(--secondary) / 0.1)', borderRadius: '8px', padding: '0.5rem 1rem' }} open={isOpen}>
        <summary style={{ fontWeight: 'bold', cursor: 'pointer', outline: 'none', padding: '0.5rem 0', color: 'hsl(var(--primary))' }}>
          {title} {selectedTags.length > 0 && <span style={{ background: 'hsl(var(--primary))', color: 'white', borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{selectedTags.length}</span>}
        </summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', paddingBottom: '0.5rem' }}>
          {allTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(setter, tag)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid',
                  backgroundColor: isSelected ? 'hsl(var(--primary))' : 'white',
                  color: isSelected ? 'white' : 'hsl(var(--primary))',
                  borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </details>
    );
  };

  const hasSelectedTags = selectedPhysical.length > 0 || selectedPatterns.length > 0 || selectedIndications.length > 0 || selectedCrudeDrugs.length > 0 || selectedClassification.length > 0;

  return (
    <div className="kampo-search-container" style={{ marginTop: '2rem' }}>

      {/* Search Input Area */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: 'hsl(var(--foreground))' }}>
            🔍 フリーワード検索
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="葛根湯、1、頭痛、不眠などを入力..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="form-input"
              style={{
                flex: '1 1 200px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid hsl(var(--secondary))',
                fontSize: '1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                flex: '0 0 auto',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'hsl(var(--primary))',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              検索
            </button>
          </div>
        </div>
      </div>

      {/* Tag Filters Area */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'hsl(var(--primary))', margin: 0 }}>🏷️ カテゴリ検索</h3>
          {hasSelectedTags && (
            <button
              onClick={resetFilters}
              style={{
                fontSize: '0.85rem',
                padding: '0.3rem 0.8rem',
                background: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
                border: '1px solid hsl(var(--destructive))',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              条件をクリア
            </button>
          )}
        </div>

        {renderTagGroup('体力 (Physical)から検索', allPhysical, selectedPhysical, setSelectedPhysical, false)}
        {renderTagGroup('症状 (Indications)から検索', allIndications, selectedIndications, setSelectedIndications, false)}
        {renderTagGroup('証・診断 (Patterns)から検索', allPatterns, selectedPatterns, setSelectedPatterns, false)}
        {renderTagGroup('使用する科 (Classification)から検索', allClassification, selectedClassification, setSelectedClassification, false)}
        {renderTagGroup('構成生薬 (Crude Drugs)から検索', allCrudeDrugs, selectedCrudeDrugs, setSelectedCrudeDrugs, false)}
      </div>

      {/* Results Area */}
      <div className="glass-panel" style={{ padding: '1.5rem' }} ref={resultsRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>📋 検索結果</h3>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'hsl(var(--primary))' }}>
            {filteredData.length} 件
          </span>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'hsl(var(--secondary) / 0.05)', borderRadius: '8px' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>該当する漢方薬が見つかりません。</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>検索条件を減らしてみてください。</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredData.map(item => (
              <div key={item.kampo_number} style={{
                padding: '1.5rem',
                border: '1px solid hsl(var(--secondary))',
                borderRadius: '12px',
                background: 'white',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: getKampoStyle(item.kampo_number).bg,
                    color: getKampoStyle(item.kampo_number).text,
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    flexShrink: 0,
                    borderRadius: '50%',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {item.kampo_number}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 min-content' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'hsl(var(--foreground))', lineHeight: '1.2' }}>{item.name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>{item.name_kana}</span>
                  </div>
                  {item.Physical && (
                    <div style={{ marginLeft: 'auto', flex: '0 0 auto' }}>
                      <span style={getPhysicalStyle(item.Physical)}>
                        {item.Physical}
                      </span>
                    </div>
                  )}
                </div>

                {item.point && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '0.8rem 1rem',
                    background: 'hsl(var(--primary) / 0.05)',
                    borderLeft: '4px solid hsl(var(--primary))',
                    borderRadius: '0 8px 8px 0'
                  }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--primary))', marginBottom: '0.4rem' }}>💡 使い分けポイント</strong>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', lineHeight: 1.5 }}>
                      {item.point}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem', fontSize: '0.9rem' }}>

                  {/* Left Column: Symptoms, Indications, Dept */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/*
                    {item.symptoms && (
                      <div style={{ background: '#f0fdf4', padding: '0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <strong style={{ color: '#166534', display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>【用法・症状】</strong>
                        <div style={{ lineHeight: 1.5, color: '#14532d' }}>{item.symptoms.split('|').join('、')}</div>
                      </div>
                    )}
                      */}


                    {item.indications && (
                      <div style={{ background: '#fdf4ff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #fae8ff' }}>
                        <strong style={{ color: '#86198f', display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>【用法・症状】</strong>
                        <div style={{ lineHeight: 1.5, color: '#701a75' }}>{item.indications.split('|').join('、')}</div>
                      </div>
                    )}
                    {item.classification && (
                      <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <strong style={{ color: '#475569', display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>【使用する科】</strong>
                        <div style={{ lineHeight: 1.5, color: '#334155' }}>{item.classification.split('|').join('、')}</div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Patterns Matrix, Crude Drugs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {item.patterns && (
                      <div style={{ background: '#fafafa', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
                        <strong style={{ color: '#525252', display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>【証・診断】</strong>
                        {renderPatternMatrix(item.patterns)}
                      </div>
                    )}
                    {item.crude_drugs && (
                      <div style={{ background: '#fffbeb', padding: '0.8rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                        <strong style={{ color: '#b45309', display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>【構成生薬】</strong>
                        <div style={{ lineHeight: 1.5, color: '#92400e' }}>
                          {item.crude_drugs.split('|').join(' ／ ')}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
