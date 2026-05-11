'use client';

import React, { useState } from 'react';

const potassiumDrugs = [
    { id: 'aspartate_tab', name: 'アスパラカリウム錠300mg', equivalent: 1.8, unit: '錠' },
    { id: 'aspartate_pwd', name: 'アスパラカリウム散50％', equivalent: 2.9, unit: 'g' },
    { id: 'gluconate_tab_2_5', name: 'グルコンサンK錠2.5mEq', equivalent: 2.5, unit: '錠' },
    { id: 'gluconate_tab_5', name: 'グルコンサンK錠5mEq', equivalent: 5.0, unit: '錠' },
    { id: 'gluconate_pwd', name: 'グルコンサンK細粒4mEq/g', equivalent: 4.0, unit: 'g' },
    { id: 'kcl_pwd', name: '塩化カリウム', equivalent: 13.4, unit: 'g' },
];

export default function PotassiumCalc() {
    const [baseMeq, setBaseMeq] = useState(''); // 内部的にmEqを保持
    const [lastInputId, setLastInputId] = useState('');

    const handleInputChange = (id, value) => {
        if (value === '') {
            setBaseMeq('');
            setLastInputId('');
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return;

        if (id === 'meq_input') {
            setBaseMeq(numValue);
            setLastInputId('meq_input');
        } else {
            const drug = potassiumDrugs.find(d => d.id === id);
            if (drug) {
                const calculatedMeq = numValue * drug.equivalent;
                setBaseMeq(calculatedMeq);
                setLastInputId(id);
            }
        }
    };

    const handleClear = () => {
        setBaseMeq('');
        setLastInputId('');
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🍌 カリウム製剤換算ツール</span>
                <button
                    onClick={handleClear}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                >
                    クリア
                </button>
            </h2>

            <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>
                いずれかの製剤量（錠・g）またはカリウム量（mEq）を入力すると、他の製剤の等価量が自動で計算されます。
            </p>

            {/* mEq Input Section */}
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'hsl(var(--primary) / 0.1)', borderRadius: '8px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'hsl(var(--primary))' }}>
                    総カリウム量 (mEq) から計算
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="number"
                        value={lastInputId === 'meq_input' ? (baseMeq !== '' ? baseMeq : '') : (baseMeq !== '' ? Math.round(baseMeq * 100) / 100 : '')}
                        onChange={(e) => handleInputChange('meq_input', e.target.value)}
                        placeholder="例: 10"
                        min="0"
                        step="any"
                        style={{ width: '150px', padding: '0.8rem', borderRadius: '8px', border: '2px solid hsl(var(--primary))', fontSize: '1.2rem', textAlign: 'right', fontWeight: 'bold' }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>mEq</span>
                </div>
            </div>

            {/* Drugs List Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {potassiumDrugs.map((drug) => {
                    let displayValue = '';
                    if (baseMeq !== '') {
                        if (drug.id === lastInputId) {
                            displayValue = (Math.round((baseMeq / drug.equivalent) * 100) / 100).toString();
                        } else {
                            const calcValue = baseMeq / drug.equivalent;
                            displayValue = (Math.round(calcValue * 100) / 100).toString();
                        }
                    }

                    return (
                        <div key={drug.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            background: 'hsl(var(--secondary) / 0.1)', 
                            padding: '1rem', 
                            borderRadius: '8px',
                            border: '1px solid transparent'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'hsl(var(--foreground))' }}>
                                    {drug.name}
                                </div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                    1{drug.unit} = {drug.equivalent} mEq
                                </div>
                            </div>
                            
                            {/* Input / Display Field */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        value={displayValue}
                                        onChange={(e) => handleInputChange(drug.id, e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="any"
                                        style={{ width: '120px', padding: '0.6rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '1.1rem', textAlign: 'right' }}
                                    />
                                    <span style={{ fontWeight: 'bold', color: 'hsl(var(--secondary-foreground))', width: '20px' }}>{drug.unit}</span>
                                </div>
                                {displayValue !== '' && (
                                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--primary))', fontWeight: 'bold' }}>
                                        (= {Math.round(parseFloat(displayValue) * drug.equivalent * 100) / 100} mEq)
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'hsl(var(--secondary) / 0.05)', borderRadius: '8px', fontSize: '0.85rem', opacity: 0.8 }}>
                <p style={{ margin: 0 }}><strong>参考値（添付文書等より）:</strong><br />
                ・アスパラカリウム錠300mg： 1錠 ≒ 1.8 mEq<br />
                ・アスパラカリウム散50%： 1g ≒ 2.9 mEq<br />
                ・グルコンサンK錠2.5mEq： 1錠 = 2.5 mEq<br />
                ・グルコンサンK錠5mEq： 1錠 = 5.0 mEq<br />
                ・グルコンサンK細粒4mEq/g： 1g = 4.0 mEq<br />
                ・塩化カリウム： 1g ≒ 13.4 mEq
                </p>
            </div>
        </div>
    );
}
