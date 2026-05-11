'use client';

import React, { useState, useEffect } from 'react';

const NARCOTIC_OPTIONS = [
    { label: 'アンペック注 10mg (1mL)', mgPerAmp: 10, mlPerAmp: 1 },
    { label: 'アンペック注 50mg (5mL)', mgPerAmp: 50, mlPerAmp: 5 },
    { label: 'アンペック注 200mg (20mL)', mgPerAmp: 200, mlPerAmp: 20 },
    { label: 'オキファスト注 10mg (1mL)', mgPerAmp: 10, mlPerAmp: 1 },
    { label: 'オキファスト注 50mg (5mL)', mgPerAmp: 50, mlPerAmp: 5 },
    { label: 'ナルベイン注 2mg (1mL)', mgPerAmp: 2, mlPerAmp: 1 },
    { label: 'ナルベイン注 10mg (1mL)', mgPerAmp: 10, mlPerAmp: 1 },
    { label: 'ナルベイン注 20mg (2mL)', mgPerAmp: 20, mlPerAmp: 2 },
    { label: 'モルヒネ注 10mg (1mL)', mgPerAmp: 10, mlPerAmp: 1 },
    { label: 'モルヒネ注 50mg (5mL)', mgPerAmp: 50, mlPerAmp: 5 },
    { label: 'モルヒネ注 200mg (20mL)', mgPerAmp: 200, mlPerAmp: 20 },
    { label: 'フェンタニル注 0.1mg (2mL)', mgPerAmp: 0.1, mlPerAmp: 2 },
    { label: 'フェンタニル注 0.25mg (5mL)', mgPerAmp: 0.25, mlPerAmp: 5 },
    { label: 'フェンタニル注 0.5mg (10mL)', mgPerAmp: 0.5, mlPerAmp: 10 },
    { label: '手入力...', mgPerAmp: 0, mlPerAmp: 0 }
];

export default function NarcoticPumpCalc() {
    // 1. ポンプ基本設定
    const [totalVolume, setTotalVolume] = useState(96);
    const [baseFlowRate, setBaseFlowRate] = useState(0.5);
    const [narcoticDailyDoseMg, setNarcoticDailyDoseMg] = useState(20); // 麻薬の1日量を追加

    // 2. レスキュー(PCA)設定
    const [hasPca, setHasPca] = useState(false);
    const [pcaVolume, setPcaVolume] = useState(0.5);
    const [isPcaVolumeManual, setIsPcaVolumeManual] = useState(false);
    const [pcaFreq, setPcaFreq] = useState(3);

    // 3. 麻薬アンプルリスト（複数選択）
    // 複数規格を組み合わせて必要量（narcoticDailyDoseMg × 日数）を満たすアルゴリズム用
    const [selectedAmps, setSelectedAmps] = useState([
        { id: Date.now(), isCustom: false, selectedOption: 1, customName: '', customMg: 0, customMl: 0 }
    ]);

    // 4. その他液剤リスト
    const [otherLiquids, setOtherLiquids] = useState([]);

    const [results, setResults] = useState(null);

    // ベース流速が変更されたとき、PCA量が手動変更されていなければ連動させる
    const handleBaseFlowRateChange = (val) => {
        setBaseFlowRate(val);
        if (!isPcaVolumeManual) {
            setPcaVolume(val);
        }
    };

    const handlePcaVolumeChange = (val) => {
        setPcaVolume(val);
        setIsPcaVolumeManual(true);
    };

    const addAmpoule = () => {
        setSelectedAmps([
            ...selectedAmps,
            { id: Date.now(), isCustom: false, selectedOption: 0, customName: '', customMg: 0, customMl: 0 }
        ]);
    };

    const removeAmpoule = (id) => {
        setSelectedAmps(selectedAmps.filter(d => d.id !== id));
    };

    const updateAmpoule = (id, field, value) => {
        setSelectedAmps(selectedAmps.map(d => {
            if (d.id === id) {
                const newD = { ...d, [field]: value };
                if (field === 'selectedOption') {
                    const opt = NARCOTIC_OPTIONS[value];
                    if (opt.mgPerAmp === 0) {
                        newD.isCustom = true;
                        newD.customName = '';
                    } else {
                        newD.isCustom = false;
                        newD.customName = opt.label;
                    }
                }
                return newD;
            }
            return d;
        }));
    };

    const addOtherLiquid = () => {
        setOtherLiquids([
            ...otherLiquids,
            { id: Date.now(), name: '', totalVolume: 0 }
        ]);
    };

    const removeOtherLiquid = (id) => {
        setOtherLiquids(otherLiquids.filter(l => l.id !== id));
    };

    const updateOtherLiquid = (id, field, value) => {
        setOtherLiquids(otherLiquids.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    useEffect(() => {
        calculate();
    }, [totalVolume, baseFlowRate, narcoticDailyDoseMg, hasPca, pcaVolume, pcaFreq, selectedAmps, otherLiquids]);

    const calculate = () => {
        // 1. 1日の液量消費 (mL/day)
        const dailyBaseVolume = baseFlowRate * 24;
        const dailyPcaVolume = hasPca ? (pcaVolume * pcaFreq) : 0;
        const dailyTotalVolume = dailyBaseVolume + dailyPcaVolume;

        if (dailyTotalVolume <= 0 || totalVolume <= 0) {
            setResults(null);
            return;
        }

        // 2. ポンプ持続期間
        const durationDaysExact = totalVolume / dailyTotalVolume;
        const durationDays = Math.floor(durationDaysExact);
        const durationHoursExact = (durationDaysExact - durationDays) * 24;
        const durationHours = Math.round(durationHoursExact * 10) / 10;

        // 3. 麻薬必要量の最適本数計算（Greedyアルゴリズム）
        const totalRequiredMg = narcoticDailyDoseMg * durationDaysExact;
        let remainingMg = totalRequiredMg; // この量を目指してアンプルを埋めていく

        // 選択されたアンプルをmgの大きい順にソートする
        const sortedAmps = [...selectedAmps].map(a => {
            const mg = a.isCustom ? a.customMg : NARCOTIC_OPTIONS[a.selectedOption].mgPerAmp;
            const ml = a.isCustom ? a.customMl : NARCOTIC_OPTIONS[a.selectedOption].mlPerAmp;
            const name = a.isCustom ? a.customName : NARCOTIC_OPTIONS[a.selectedOption].label;
            return { ...a, mg, ml, name };
        }).sort((a, b) => b.mg - a.mg);

        const drugResults = [];

        for (let i = 0; i < sortedAmps.length; i++) {
            const amp = sortedAmps[i];
            if (amp.mg <= 0) continue;

            let requiredAmps = 0;
            let targetMgForThisAmp = 0;

            if (i === sortedAmps.length - 1) {
                // 最も小さい規格（最後のアンプル）なので、残りの全てを賄うために「切り上げ」
                requiredAmps = Math.ceil(remainingMg / amp.mg);
                targetMgForThisAmp = remainingMg;
            } else {
                // まだ小さい規格があるため、現時点では完全なアンプルのみ使用（切り捨て）
                requiredAmps = Math.floor(remainingMg / amp.mg);
                targetMgForThisAmp = requiredAmps * amp.mg;
            }

            if (requiredAmps < 0) requiredAmps = 0;
            if (targetMgForThisAmp < 0) targetMgForThisAmp = 0;

            // 実際にアンプルから吸い上げる液量
            const drawnVolume = (targetMgForThisAmp / amp.mg) * amp.ml;
            const fullVolume = requiredAmps * amp.ml;
            const discardVolume = fullVolume - drawnVolume;

            remainingMg -= targetMgForThisAmp;

            drugResults.push({
                name: amp.name,
                mgPerAmp: amp.mg,
                mlPerAmp: amp.ml,
                requiredAmps,
                drawnVolume,
                discardVolume
            });
        }

        const totalProvidedMg = drugResults.reduce((sum, d) => sum + (d.requiredAmps * d.mgPerAmp), 0);

        // 4. その他液剤の計算（そのまま足し合わせるだけ）
        const otherLiquidResults = otherLiquids.map(liq => ({
            ...liq,
            totalVolume: liq.totalVolume || 0
        }));

        // 5. 希釈液 (生食など) の計算
        // 実際に吸い上げる液量(drawnVolume)だけを足し、全容量から引く
        const allDrugsVolume = drugResults.reduce((sum, d) => sum + d.drawnVolume, 0);
        const allOthersVolume = otherLiquidResults.reduce((sum, l) => sum + l.totalVolume, 0);

        let diluentVolume = totalVolume - allDrugsVolume - allOthersVolume;
        const isOverflow = diluentVolume < 0;
        if (diluentVolume < 0) diluentVolume = 0;

        setResults({
            dailyBaseVolume,
            dailyPcaVolume,
            dailyTotalVolume,
            durationDaysExact,
            durationDays,
            durationHours,
            totalRequiredMg,
            totalProvidedMg,
            drugResults,
            otherLiquidResults,
            diluentVolume,
            isOverflow
        });
    };

    return (
        <div className="glass-panel" style={{ padding: 'clamp(1rem, 3vw, 2rem)', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                💉 麻薬ポンプ液量計算ツール
            </h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '2rem' }}>
                持続注入ポンプ（PCA機能付き）の流量、全体容量、レスキュー設定から、持続日数や必要なアンプル数、希釈液量を自動計算します。<br />
                複数規格のアンプル（例：50mgと10mg）を選択すると、合計調製量が最小本数になるよう自動計算します。
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>

                {/* 1. 基本設定 */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--secondary) / 0.1)' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.1rem', borderBottom: '1px solid hsl(var(--secondary))', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚙️</span> ポンプ基本設定
                    </h3>

                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'hsl(var(--primary))' }}>
                                麻薬の1日指示量 (mg/日)
                            </label>
                            <input
                                type="number"
                                value={narcoticDailyDoseMg}
                                onChange={(e) => setNarcoticDailyDoseMg(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '2px solid hsl(var(--primary) / 0.5)', fontSize: '1rem', fontWeight: 'bold' }}
                                min="0" step="1"
                            />
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.3rem' }}>例: 20 (モルヒネ20mg/日の場合)</p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>設定全体容量 (mL)</label>
                            <input
                                type="number"
                                value={totalVolume}
                                onChange={(e) => setTotalVolume(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--primary))', fontSize: '1rem' }}
                                min="1"
                            />
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.3rem' }}>ポンプカセットやシリンジの総容量</p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>ベース流速 (mL/hr)</label>
                            <input
                                type="number"
                                value={baseFlowRate}
                                onChange={(e) => handleBaseFlowRateChange(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--primary))', fontSize: '1rem' }}
                                min="0" step="0.1"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. レスキュー設定 */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--secondary) / 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(var(--secondary))', paddingBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🚨</span> レスキュー(PCA)設定
                        </h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={hasPca}
                                onChange={(e) => setHasPca(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>PCAあり</span>
                        </label>
                    </div>

                    {hasPca ? (
                        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>1回のレスキュー量 (mL/回)</label>
                                <input
                                    type="number"
                                    value={pcaVolume}
                                    onChange={(e) => handlePcaVolumeChange(Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--primary))', fontSize: '1rem' }}
                                    min="0" step="0.1"
                                />
                                {!isPcaVolumeManual && (
                                    <p style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.3rem' }}>※ベース流速（1時間量）と連動中</p>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>1日あたりの想定使用回数 (回/日)</label>
                                <input
                                    type="number"
                                    value={pcaFreq}
                                    onChange={(e) => setPcaFreq(Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--primary))', fontSize: '1rem' }}
                                    min="0"
                                />
                                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.3rem' }}>持続日数を計算するための見積もり回数です</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                            レスキュー(PCA)を使用しない
                        </div>
                    )}
                </div>
            </div>

            {/* 3. アンプル設定 */}
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ borderBottom: '2px', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💊</span> 使用する麻薬製剤（アンプル）の候補
                </h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '1rem' }}>
                    ※複数個追加すると、最も大きい規格から優先的に使用し、トータル本数が少なくなるよう自動計算されます。
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedAmps.map((amp, index) => (
                        <div key={amp.id} className="glass-panel" style={{ padding: '1rem', position: 'relative', border: '1px solid hsl(var(--secondary) / 0.5)' }}>
                            {selectedAmps.length > 1 && (
                                <button
                                    onClick={() => removeAmpoule(amp.id)}
                                    style={{
                                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                                        border: 'none', background: 'transparent', color: '#e11d48',
                                        cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
                                    }}
                                    title="削除"
                                >×</button>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>製剤選択</label>
                                    <select
                                        value={amp.selectedOption}
                                        onChange={(e) => updateAmpoule(amp.id, 'selectedOption', Number(e.target.value))}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '0.9rem' }}
                                    >
                                        {NARCOTIC_OPTIONS.map((opt, i) => (
                                            <option key={i} value={i}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {amp.isCustom ? (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>薬剤名</label>
                                            <input
                                                type="text" value={amp.customName}
                                                onChange={(e) => updateAmpoule(amp.id, 'customName', e.target.value)}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>含有量(mg)</label>
                                            <input
                                                type="number" value={amp.customMg}
                                                onChange={(e) => updateAmpoule(amp.id, 'customMg', Number(e.target.value))}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>液量(mL)</label>
                                            <input
                                                type="number" value={amp.customMl}
                                                onChange={(e) => updateAmpoule(amp.id, 'customMl', Number(e.target.value))}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))}

                    <button onClick={addAmpoule} style={{ padding: '0.8rem', background: 'transparent', color: 'hsl(var(--primary))', border: '1px dashed hsl(var(--primary))', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        + アンプル候補を追加（複数規格を使用する場合）
                    </button>
                </div>
            </div>

            {/* 4. その他液剤設定 */}
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ borderBottom: '2px solid hsl(var(--primary) / 0.4)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💧</span> その他追加する液剤（制吐剤など）
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {otherLiquids.map((liq) => (
                        <div key={liq.id} className="glass-panel" style={{ padding: '1rem', position: 'relative', border: '1px solid hsl(var(--secondary) / 0.5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <button
                                onClick={() => removeOtherLiquid(liq.id)}
                                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', border: 'none', background: 'transparent', color: '#e11d48', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                            >×</button>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>液剤名・規格</label>
                                <input type="text" value={liq.name} onChange={(e) => updateOtherLiquid(liq.id, 'name', e.target.value)} placeholder="例: プリンペラン注10mg 20mL" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))' }} />
                            </div>
                            <div style={{ paddingRight: '0' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>加える全容量 (mL)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="number" value={liq.totalVolume} onChange={(e) => updateOtherLiquid(liq.id, 'totalVolume', Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))' }} min="0" step="1" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={addOtherLiquid} style={{ padding: '0.8rem', background: 'transparent', color: 'black', border: '1px dashed hsl(var(--secondary))', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        + その他液剤を追加
                    </button>
                </div>
            </div>

            {/* 計算結果エリア */}
            {results && (
                <div style={{ marginTop: '3rem', borderTop: '3px solid hsl(var(--primary))', paddingTop: '2rem' }}>
                    <h2 style={{ textAlign: 'center', color: 'hsl(var(--primary))', marginBottom: '2rem' }}>✨ 計算結果 ✨</h2>

                    {results.isOverflow && (
                        <div style={{ background: '#ffe4e6', color: '#e11d48', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #fda4af', fontWeight: 'bold', textAlign: 'center' }}>
                            ⚠️ エラー: 薬液の合計量が全体容量（{totalVolume} mL）を超えています！設定を見直してください。
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

                        {/* 期間と消費量 */}
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'hsl(var(--primary) / 0.05)', border: '2px solid hsl(var(--primary) / 0.2)' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', opacity: 0.8 }}>ポンプの持続期間</h3>
                            <div style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: '900', color: 'hsl(var(--primary))', lineHeight: 1.2 }}>
                                {results.durationDays}<span style={{ fontSize: 'clamp(1rem, 4vw, 1.2rem)' }}> 日と </span>{results.durationHours}<span style={{ fontSize: 'clamp(1rem, 4vw, 1.2rem)' }}> 時間</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '1rem' }}>
                                （正確な理論日数: 約 {Math.round(results.durationDaysExact * 100) / 100} 日）
                            </p>

                            <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px dashed hsl(var(--primary) / 0.3)' }} />

                            <div style={{ background: 'hsl(var(--secondary) / 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>持続期間中に必要な麻薬総量</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>
                                    約 {Math.round(results.totalRequiredMg * 10) / 10} <span style={{ fontSize: '1rem' }}>mg</span>
                                </div>
                            </div>

                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', opacity: 0.8 }}>1日あたりの消費量内訳</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                                <span>ベース分:</span>
                                <strong>{Math.round(results.dailyBaseVolume * 10) / 10} mL</strong>
                            </div>
                            {hasPca && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                                    <span>レスキュー分(予測):</span>
                                    <strong>{Math.round(results.dailyPcaVolume * 10) / 10} mL</strong>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', color: 'hsl(var(--primary))', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid hsl(var(--primary) / 0.2)' }}>
                                <span>1日計:</span>
                                <span>{Math.round(results.dailyTotalVolume * 10) / 10} mL / 日</span>
                            </div>
                        </div>

                        {/* 調製レシピ */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid hsl(var(--secondary))', paddingBottom: '0.5rem' }}>
                                📋 調製レシピ（混注する内容）
                            </h3>

                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {results.drugResults.map((d, i) => (
                                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid hsl(var(--secondary) / 0.3)' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{d.name || '(名称未入力)'}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{d.mgPerAmp}mg/{d.mlPerAmp}mL 規格</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{d.requiredAmps} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>本</span></div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e11d48' }}>抽出: {Math.round(d.drawnVolume * 100) / 100} mL</div>
                                            {d.discardVolume > 0.001 && (
                                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                    (余部 {Math.round(d.discardVolume * 100) / 100} mL は破棄)
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}

                                {results.otherLiquidResults.map((l, i) => (
                                    l.totalVolume > 0 && (
                                        <li key={`other-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: '1px solid hsl(var(--secondary) / 0.3)' }}>
                                            <div style={{ fontWeight: 'bold' }}>{l.name || 'その他液剤'}</div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{l.totalVolume} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>mL</span></div>
                                            </div>
                                        </li>
                                    )
                                ))}

                                <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0 0.5rem', background: 'hsl(var(--secondary) / 0.1)', borderRadius: '8px', marginTop: '0.5rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
                                    <div style={{ fontWeight: 'bold', color: '#0369a1' }}>💧 生理食塩水 等 (残りの希釈液)</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0369a1' }}>
                                        {Math.round(results.diluentVolume * 10) / 10} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>mL</span>
                                    </div>
                                </li>
                            </ul>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid hsl(var(--primary))' }}>
                                <div style={{ fontWeight: 'bold' }}>合計容量 </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'hsl(var(--primary))' }}>
                                    {totalVolume} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>mL</span>
                                </div>
                            </div>
                        </div>

                    </div>


                </div>
            )}
        </div>
    );
}
