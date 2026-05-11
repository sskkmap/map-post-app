'use client';

import React, { useState } from 'react';

const steroids = [
    { id: 'hydrocortisone', name: 'ヒドロコルチゾン', equivalent: 20 },
    { id: 'cortisone', name: 'コルチゾン', equivalent: 25 },
    { id: 'prednisolone', name: 'プレドニゾロン', equivalent: 5 },
    { id: 'methylprednisolone', name: 'メチルプレドニゾロン', equivalent: 4 },
    { id: 'triamcinolone', name: 'トリアムシノロン', equivalent: 4 },
    { id: 'dexamethasone', name: 'デキサメタゾン', equivalent: 0.75 },
    { id: 'betamethasone', name: 'ベタメタゾン', equivalent: 0.75 },
];

export default function SteroidCalc() {
    const [baseDose, setBaseDose] = useState(''); // Store internally as Prednisolone equivalent amount
    const [lastInputId, setLastInputId] = useState(''); // To keep the user's input exact

    const handleInputChange = (id, value) => {
        if (value === '') {
            setBaseDose('');
            setLastInputId('');
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return;

        const steroid = steroids.find(s => s.id === id);
        if (steroid) {
            // Calculate Prednisolone equivalent: (input dose / its equivalent) * 5
            const predDose = (numValue / steroid.equivalent) * 5;
            setBaseDose(predDose);
            setLastInputId(id);
        }
    };

    const handleClear = () => {
        setBaseDose('');
        setLastInputId('');
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>💊 ステロイド換算ツール</span>
                <button
                    onClick={handleClear}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                >
                    クリア
                </button>
            </h2>

            <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>
                いずれかの薬剤に投与量(mg)を入力すると、他の薬剤の等価量が自動計算されます。
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {steroids.map((steroid) => {
                    let displayValue = '';
                    if (baseDose !== '') {
                        if (steroid.id === lastInputId) {
                            // Recover the exact value for the input field being typed in, to prevent rounding issues while typing
                            displayValue = ((baseDose / 5) * steroid.equivalent).toString(); 
                            // Since we want to let them type decimals easily, maybe just let value come from state but formatted
                            displayValue = (Math.round(((baseDose / 5) * steroid.equivalent) * 1000) / 1000).toString();
                        } else {
                            // Calculate other values based on Prednisolone base dose
                            const calcValue = (baseDose / 5) * steroid.equivalent;
                            displayValue = (Math.round(calcValue * 100) / 100).toString();
                        }
                    }

                    return (
                        <div key={steroid.id} style={{ display: 'flex', alignItems: 'center', background: 'hsl(var(--secondary) / 0.1)', padding: '1rem', borderRadius: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'hsl(var(--primary))' }}>{steroid.name}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>等価量: {steroid.equivalent}mg</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    value={displayValue}
                                    onChange={(e) => handleInputChange(steroid.id, e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="any"
                                    style={{ width: '120px', padding: '0.8rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1.1rem', textAlign: 'right' }}
                                />
                                <span style={{ fontWeight: 'bold', color: 'hsl(var(--secondary-foreground))' }}>mg</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'hsl(var(--destructive) / 0.05)', borderRadius: '8px', fontSize: '0.85rem', opacity: 0.8, borderLeft: '4px solid hsl(var(--destructive))' }}>
                <p style={{ margin: 0 }}><strong>注意:</strong> 換算値はあくまで目安です。実際の投与量は患者の状態（肝機能、腎機能、病態など）を考慮して決定してください。</p>
            </div>
        </div>
    );
}
