'use client';

import React, { useState } from 'react';

// 基本となる経口モルヒネ換算値 (デバッグ用に仮の値を設定。後で修正可能)
// 例：対象薬 = 経口モルヒネ 30mg に相当する量
const opioids = [
    // 経口
    { id: 'po_morphine', name: '経口モルヒネ', products: 'MSコンチン', equivalent: 30, unit: 'mg/日' },
    { id: 'po_oxycodone', name: '経口オキシコドン', products: 'オキシコンチンTR', equivalent: 20, unit: 'mg/日' },
    { id: 'po_hydromorphone', name: '経口ヒドロモルフォン', products: 'ナルサス', equivalent: 6, unit: 'mg/日' },
    { id: 'po_tramadol', name: '経口トラマドール', products: 'トラマドールOD、ワントラム', equivalent: 150, unit: 'mg/日' },
    { id: 'po_tapentadol', name: '経口タペンタドール', products: 'タペンタ', equivalent: 100, unit: 'mg/日' },
    // 経皮
    { id: 'td_fentanyl', name: '経皮フェンタニル', products: 'フェントステープ', equivalent: 1, unit: 'mg/日' },
    // 静注/皮下注
    { id: 'iv_morphine', name: '静注モルヒネ', products: 'モルヒネ塩酸塩注など', equivalent: 15, unit: 'mg/日' },
    { id: 'iv_oxycodone', name: '静注オキシコドン', products: 'オキファスト注など', equivalent: 15, unit: 'mg/日' },
    { id: 'iv_hydromorphone', name: '静注ヒドロモルフォン', products: 'ナルベイン注', equivalent: 1.2, unit: 'mg/日' },
];

export default function OpioidCalc() {
    const [baseMorphine, setBaseMorphine] = useState(''); // 内部的に経口モルヒネ量(mg)を保持
    const [lastInputId, setLastInputId] = useState('');

    const handleInputChange = (id, value) => {
        if (value === '') {
            setBaseMorphine('');
            setLastInputId('');
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return;

        const drug = opioids.find(d => d.id === id);
        if (drug) {
            // 経口モルヒネ換算値の計算：(入力値 / その薬の等価量) * 30
            const calculatedMorphine = (numValue / drug.equivalent) * 30;
            setBaseMorphine(calculatedMorphine);
            setLastInputId(id);
        }
    };

    const handleClear = () => {
        setBaseMorphine('');
        setLastInputId('');
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🛡️ 麻薬換算（オピオイド換算）ツール</span>
                <button
                    onClick={handleClear}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                >
                    クリア
                </button>
            </h2>

            <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>
                定時量などを入力すると、経口モルヒネ等価量に基づいて他のオピオイドの量が自動計算されます。<br />
                <span style={{ fontSize: '0.85rem' }}>※換算値は一般的なガイドライン（富山大学オピオイドスイッチング換算表など）に基づく目安です。交差耐性を考慮して、スイッチング時は計算値から20〜30%減量することが推奨されます。</span>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {opioids.map((drug) => {
                    let displayValue = '';
                    if (baseMorphine !== '') {
                        if (drug.id === lastInputId) {
                            displayValue = (Math.round(((baseMorphine / 30) * drug.equivalent) * 100) / 100).toString();
                        } else {
                            const calcValue = (baseMorphine / 30) * drug.equivalent;
                            displayValue = (Math.round(calcValue * 100) / 100).toString();
                        }
                    }

                    const isBase = drug.id === 'po_morphine';

                    return (
                        <div key={drug.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: isBase ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--secondary) / 0.1)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: isBase ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid transparent'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: isBase ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                                    {drug.name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--secondary-foreground))', marginTop: '0.2rem', marginBottom: '0.3rem' }}>
                                    {drug.products}
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                    {isBase ? '基準薬' : `等価量: ${drug.equivalent}${drug.unit} = 経口モルヒネ 30mg/日`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    value={displayValue}
                                    onChange={(e) => handleInputChange(drug.id, e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="any"
                                    style={{ width: '120px', padding: '0.8rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1.1rem', textAlign: 'right' }}
                                />
                                <span style={{ fontWeight: 'bold', color: 'hsl(var(--secondary-foreground))', width: '40px' }}>{drug.unit}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
