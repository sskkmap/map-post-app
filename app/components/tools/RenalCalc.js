'use client';

import React, { useState, useEffect } from 'react';

export default function RenalCalc() {
    const [gender, setGender] = useState('male');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [scr, setScr] = useState('');

    const [ccr, setCcr] = useState(null);
    const [egfr, setEgfr] = useState(null);

    useEffect(() => {
        calculate();
    }, [gender, age, weight, scr]);

    const calculate = () => {
        const numAge = parseFloat(age);
        const numWeight = parseFloat(weight);
        const numScr = parseFloat(scr);

        // CCr calculation (Cockcroft-Gault)
        if (!isNaN(numAge) && !isNaN(numWeight) && !isNaN(numScr) && numAge > 0 && numWeight > 0 && numScr > 0) {
            let calcCcr = ((140 - numAge) * numWeight) / (72 * numScr);
            if (gender === 'female') {
                calcCcr *= 0.85;
            }
            setCcr(calcCcr.toFixed(1));
        } else {
            setCcr(null);
        }

        // eGFR calculation (Japanese equation)
        if (!isNaN(numAge) && !isNaN(numScr) && numAge > 0 && numScr > 0) {
            let calcEgfr = 194 * Math.pow(numScr, -1.094) * Math.pow(numAge, -0.287);
            if (gender === 'female') {
                calcEgfr *= 0.739;
            }
            setEgfr(calcEgfr.toFixed(1));
        } else {
            setEgfr(null);
        }
    };

    const handleClear = () => {
        setGender('male');
        setAge('');
        setWeight('');
        setScr('');
    };

    const getCkdStage = (gfrValue) => {
        if (!gfrValue) return null;
        const val = parseFloat(gfrValue);
        if (val >= 90) return { stage: 'G1', color: '#22c55e', text: '正常または高値' };
        if (val >= 60) return { stage: 'G2', color: '#84cc16', text: '正常または軽度低下' };
        if (val >= 45) return { stage: 'G3a', color: '#eab308', text: '軽度〜中等度低下' };
        if (val >= 30) return { stage: 'G3b', color: '#f97316', text: '中等度〜高度低下' };
        if (val >= 15) return { stage: 'G4', color: '#ef4444', text: '高度低下' };
        return { stage: 'G5', color: '#b91c1c', text: '末期腎不全 (ESKD)' };
    };

    const ckdStage = getCkdStage(egfr);

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🧮 腎機能計算ツール</span>
                <button
                    onClick={handleClear}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                >
                    クリア
                </button>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* 入力フォーム */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--secondary) / 0.1)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'hsl(var(--primary))' }}>入力項目</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>性別</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="male"
                                    checked={gender === 'male'}
                                    onChange={(e) => setGender(e.target.value)}
                                    style={{ accentColor: 'hsl(var(--primary))' }}
                                />
                                男性
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="female"
                                    checked={gender === 'female'}
                                    onChange={(e) => setGender(e.target.value)}
                                    style={{ accentColor: 'hsl(var(--primary))' }}
                                />
                                女性
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>年齢 (歳)</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="例: 65"
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>体重 (kg)</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="例: 60"
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1rem' }}
                        />
                        <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem' }}>※CCrの計算に必要です</p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>血清クレアチニン (mg/dL)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={scr}
                            onChange={(e) => setScr(e.target.value)}
                            placeholder="例: 1.0"
                            style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1rem' }}
                        />
                    </div>
                </div>

                {/* 計算結果 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '2px solid hsl(var(--primary) / 0.2)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
                            クレアチニンクリアランス (CCr)
                        </h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: ccr ? 'hsl(var(--primary))' : 'hsl(var(--secondary-foreground) / 0.3)', margin: '0.5rem 0' }}>
                            {ccr ? ccr : '---'} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'hsl(var(--secondary-foreground))' }}>mL/min</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Cockcroft-Gault式</p>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '2px solid hsl(var(--primary) / 0.2)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
                            推算糸球体濾過量 (eGFR)
                        </h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: egfr ? 'hsl(var(--primary))' : 'hsl(var(--secondary-foreground) / 0.3)', margin: '0.5rem 0' }}>
                            {egfr ? egfr : '---'} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'hsl(var(--secondary-foreground))' }}>mL/min/1.73m²</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>日本人向け推算式</p>

                        {ckdStage && (
                            <div style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '8px', background: 'hsl(var(--primary) / 0.05)', border: `1px solid ${ckdStage.color}50` }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>CKDステージ分類の目安</div>
                                <div style={{ color: ckdStage.color, fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {ckdStage.stage} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>({ckdStage.text})</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
