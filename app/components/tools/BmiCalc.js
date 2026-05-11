'use client';

import React, { useState, useEffect } from 'react';

export default function BmiCalc() {
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const [bmi, setBmi] = useState(null);
    const [ibw, setIbw] = useState(null);
    const [diff, setDiff] = useState(null);

    useEffect(() => {
        calculate();
    }, [height, weight]);

    const calculate = () => {
        const numHeightCm = parseFloat(height);
        const numWeight = parseFloat(weight);

        if (!isNaN(numHeightCm) && !isNaN(numWeight) && numHeightCm > 0 && numWeight > 0) {
            const numHeightM = numHeightCm / 100;
            const calcBmi = numWeight / (numHeightM * numHeightM);
            const calcIbw = (numHeightM * numHeightM) * 22;
            
            setBmi(calcBmi.toFixed(1));
            setIbw(calcIbw.toFixed(1));
            setDiff((numWeight - calcIbw).toFixed(1));
        } else if (!isNaN(numHeightCm) && numHeightCm > 0 && (isNaN(numWeight) || numWeight === 0)) {
            // Only height is entered, we can still calculate standard weight
            const numHeightM = numHeightCm / 100;
            const calcIbw = (numHeightM * numHeightM) * 22;
            setIbw(calcIbw.toFixed(1));
            setBmi(null);
            setDiff(null);
        } else {
            setBmi(null);
            setIbw(null);
            setDiff(null);
        }
    };

    const handleClear = () => {
        setHeight('');
        setWeight('');
    };

    const getObesityStage = (bmiValue) => {
        if (!bmiValue) return null;
        const val = parseFloat(bmiValue);
        if (val < 18.5) return { stage: '低体重 (やせ)', color: '#3b82f6', text: '標準体重まで増量を目指しましょう' };
        if (val < 25) return { stage: '普通体重', color: '#22c55e', text: '現在の体重を維持しましょう' };
        if (val < 30) return { stage: '肥満 (1度)', color: '#eab308', text: '生活習慣の見直しが必要です' };
        if (val < 35) return { stage: '肥満 (2度)', color: '#f97316', text: '減量に向けた取り組みが必要です' };
        if (val < 40) return { stage: '肥満 (3度)', color: '#ef4444', text: '医療機関での相談を推奨します' };
        return { stage: '肥満 (4度)', color: '#b91c1c', text: '高度な肥満です。医療機関での相談を推奨します' };
    };

    const obesityStage = getObesityStage(bmi);

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚖️ BMI・標準体重計算ツール</span>
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

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>身長 (cm)</label>
                        <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="例: 165"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1.1rem' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>体重 (kg)</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="例: 60"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid hsl(var(--secondary))', fontSize: '1.1rem' }}
                        />
                    </div>
                </div>

                {/* 計算結果 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '2px solid hsl(var(--primary) / 0.2)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
                            BMI (体格指数)
                        </h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: bmi ? 'hsl(var(--primary))' : 'hsl(var(--secondary-foreground) / 0.3)', margin: '0.5rem 0' }}>
                            {bmi ? bmi : '---'}
                        </div>

                        {obesityStage && (
                            <div style={{ marginTop: '1rem', padding: '0.8rem', borderRadius: '8px', background: 'hsl(var(--primary) / 0.05)', border: `1px solid ${obesityStage.color}50` }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>日本肥満学会の判定基準</div>
                                <div style={{ color: obesityStage.color, fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.3rem' }}>
                                    {obesityStage.stage}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--foreground))', opacity: 0.8 }}>
                                    {obesityStage.text}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '2px solid hsl(var(--primary) / 0.2)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
                            標準体重 (BMI 22)
                        </h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: ibw ? 'hsl(var(--primary))' : 'hsl(var(--secondary-foreground) / 0.3)', margin: '0.5rem 0' }}>
                            {ibw ? ibw : '---'} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'hsl(var(--secondary-foreground))' }}>kg</span>
                        </div>
                        
                        {diff && (
                            <div style={{ fontSize: '0.9rem', color: 'hsl(var(--foreground))', opacity: 0.8, marginTop: '0.5rem' }}>
                                標準体重との差: <strong style={{ color: parseFloat(diff) > 0 ? '#ef4444' : (parseFloat(diff) < 0 ? '#3b82f6' : '#22c55e') }}>
                                    {parseFloat(diff) > 0 ? '+' : ''}{diff} kg
                                </strong>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
