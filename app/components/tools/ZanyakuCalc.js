'use client';

import React, { useState, useEffect } from 'react';

const COMMON_USAGES = [
    { label: '分1 (1日1回)', value: 1 },
    { label: '分2 (1日2回)', value: 2 },
    { label: '分3 (1日3回)', value: 3 },
    { label: '分4 (1日4回)', value: 4 },
    { label: '分5 (1日5回)', value: 5 },
    { label: '分6 (1日6回)', value: 6 },
];

export default function ZanyakuCalc() {
    const [drugs, setDrugs] = useState([
        { id: Date.now(), name: '', dosePerDay: 3, startDate: new Date().toISOString().split('T')[0], remainingCount: 0 }
    ]);
    const [allStartDate, setAllStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState('');
    const [results, setResults] = useState([]);
    const [bottleneckDate, setBottleneckDate] = useState(null);

    const formatInputDateStr = (dateStr) => {
        if (!dateStr) return '';
        let parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        let [yStr, mStr, dStr] = parts;
        let y = Number(yStr);
        if (y > 9999) {
            yStr = String(y).substring(0, 4);
        }
        return `${yStr}-${mStr}-${dStr}`;
    };

    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        let [y, m, d] = dateStr.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

        if (y > 9999) {
            y = Number(String(y).substring(0, 4));
        }
        return new Date(y, m - 1, d);
    };

    const formatDateLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
        return `${y}/${m}/${d}(${weekDays[date.getDay()]})`;
    };

    const addDrug = () => {
        setDrugs([...drugs, { id: Date.now(), name: '', dosePerDay: 3, startDate: new Date().toISOString().split('T')[0], remainingCount: 0 }]);
    };

    const removeDrug = (id) => {
        if (drugs.length > 1) {
            setDrugs(drugs.filter(d => d.id !== id));
        }
    };

    const updateDrug = (id, field, value) => {
        if (field === 'startDate') {
            value = formatInputDateStr(value);
        }
        setDrugs(drugs.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const updateAllStartDates = (date) => {
        const formattedDate = formatInputDateStr(date);
        setAllStartDate(formattedDate);
        setDrugs(drugs.map(d => ({ ...d, startDate: formattedDate })));
    };

    useEffect(() => {
        calculate();
    }, [drugs, targetDate]);

    const calculate = () => {
        const newResults = drugs.map((drug, index) => {
            const start = parseLocalDate(drug.startDate);
            if (!start || drug.dosePerDay <= 0) return { ...drug, originalIndex: index, endDate: null, diffDays: null, exactPillDiff: null, remainder: 0 };

            // 終了予定日 = 開始日 + (残薬数 / 1日の服用数) - 1日
            // 例: 5/1開始、3錠残、1日3錠なら、5/1で終了。
            const daysRemaining = Math.floor(drug.remainingCount / drug.dosePerDay);
            const endDate = new Date(start);
            if (daysRemaining > 0) {
                endDate.setDate(endDate.getDate() + daysRemaining - 1);
            } else if (drug.remainingCount === 0) {
                // 0個なら開始日の前日に終了している扱い（あるいは開始日当日が必要）
                endDate.setDate(endDate.getDate() - 1);
            }

            let diffDays = null;
            let exactPillDiff = null;
            const remainder = drug.remainingCount % drug.dosePerDay;

            if (targetDate) {
                const target = parseLocalDate(targetDate);
                if (target) {
                    const diffTime = endDate - target;
                    diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                    const targetTotalDays = Math.max(0, Math.round((target - start) / (1000 * 60 * 60 * 24)) + 1);
                    const totalPillsNeeded = targetTotalDays * drug.dosePerDay;
                    exactPillDiff = drug.remainingCount - totalPillsNeeded;
                }
            }

            return {
                ...drug,
                originalIndex: index,
                endDate,
                exactPillDiff,
                remainder,
                diffDays
            };
        });

        setResults(newResults);

        // ボトルネック日（全ての薬が揃っている最終日）の算出
        const validEndDates = newResults
            .filter(r => r.endDate)
            .map(r => r.endDate.getTime());

        if (validEndDates.length > 0) {
            setBottleneckDate(new Date(Math.min(...validEndDates)));
        } else {
            setBottleneckDate(null);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                💊 残薬調整・日数調整ツール
            </h2>

            <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                    持参薬の名称、1日の服用量、服用開始日、現在の残数を入力してください。<br />
                    それぞれの薬がいつまで持つか、全て揃うのはいつまでかを計算します。
                </p>
            </div>

            {/* Bulk Actions */}
            <div className="glass-panel" style={{
                padding: '1rem',
                marginBottom: '1.5rem',
                background: 'hsl(var(--primary) / 0.05)',
                border: '1px solid hsl(var(--primary) / 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>全体設定:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', opacity: 0.8 }}>一括開始日:</label>
                    <input
                        type="date"
                        value={allStartDate}
                        onChange={(e) => updateAllStartDates(e.target.value)}
                        style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '0.9rem' }}
                    />
                </div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, flex: 1 }}>※全ての薬剤の服用開始日をこの日付に変更します。</p>
            </div>

            {/* Drug List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {drugs.map((drug, index) => (
                    <div key={drug.id} className="glass-panel" style={{
                        padding: '1.2rem',
                        background: 'hsl(var(--secondary) / 0.2)',
                        position: 'relative',
                        border: '1px solid hsl(var(--secondary) / 0.5)'
                    }}>
                        <button
                            onClick={() => removeDrug(drug.id)}
                            style={{
                                position: 'absolute', top: '0.5rem', right: '0.5rem',
                                border: 'none', background: 'transparent', color: '#e11d48',
                                cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold'
                            }}
                            title="削除"
                        >
                            ×
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>薬剤名</label>
                                <input
                                    type="text"
                                    value={drug.name}
                                    placeholder="薬剤名 (自由記入)"
                                    onChange={(e) => updateDrug(drug.id, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>用法 (1日量)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        value={drug.dosePerDay}
                                        onChange={(e) => updateDrug(drug.id, 'dosePerDay', Number(e.target.value))}
                                        style={{ width: '60px', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))' }}
                                    />
                                    <select
                                        onChange={(e) => updateDrug(drug.id, 'dosePerDay', Number(e.target.value))}
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))', fontSize: '0.8rem' }}
                                    >
                                        <option value="">(一般的な用法)</option>
                                        {COMMON_USAGES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>服用開始日</label>
                                <input
                                    type="date"
                                    value={drug.startDate}
                                    onChange={(e) => updateDrug(drug.id, 'startDate', e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>残薬数 (個/錠)</label>
                                <input
                                    type="number"
                                    value={drug.remainingCount}
                                    onChange={(e) => updateDrug(drug.id, 'remainingCount', Number(e.target.value))}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--secondary))' }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addDrug}
                className="btn"
                style={{
                    width: '100%', padding: '0.8rem', marginBottom: '2rem',
                    background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))',
                    border: '1px dashed hsl(var(--primary))', fontWeight: 'bold'
                }}
            >
                + 薬剤を追加
            </button>

            {/* Overview Results */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '2px solid hsl(var(--primary) / 0.3)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', opacity: 0.7 }}>全ての薬が揃っている期限</span>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'hsl(var(--primary))', margin: '0.5rem 0' }}>
                        {bottleneckDate ? formatDateLocal(bottleneckDate) : '---'}
                    </div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>※この日を過ぎると、いずれかの薬が不足します。</p>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--secondary) / 0.1)' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>🎯 次回受診予定日 (目標日)</label>
                    <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(formatInputDateStr(e.target.value))}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid hsl(var(--primary))', fontSize: '1rem' }}
                    />
                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.6 }}>
                        次回診察日までに必要な薬の数を自動計算します。
                    </p>
                </div>
            </div>

            {/* Detailed Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid hsl(var(--secondary))' }}>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>薬剤名</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>終了予定日</th>
                            <th style={{ padding: '0.8rem', textAlign: 'center' }}>過不足日数</th>
                            <th style={{ padding: '0.8rem', textAlign: 'right' }}>必要補充量</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, i) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--secondary) / 0.5)' }}>
                                <td style={{ padding: '0.8rem' }}>{r.name || `(薬剤 ${i + 1})`}</td>
                                <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: r.endDate <= bottleneckDate ? 'hsl(var(--destructive))' : 'inherit' }}>
                                    {r.endDate ? formatDateLocal(r.endDate) : '---'}
                                </td>
                                <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: r.diffDays === null ? 'inherit' : r.diffDays < 0 ? '#e11d48' : r.diffDays > 0 ? 'hsl(var(--primary))' : 'inherit' }}>
                                    {r.diffDays !== null ? (r.diffDays < 0 ? `${r.diffDays} 日` : `+${r.diffDays} 日`) : '-'}
                                </td>
                                <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 'bold', color: r.exactPillDiff !== null && r.exactPillDiff < 0 ? '#e11d48' : r.exactPillDiff !== null && r.exactPillDiff > 0 ? 'hsl(var(--primary))' : 'inherit' }}>
                                    {r.exactPillDiff !== null ? (
                                        r.exactPillDiff < 0 ? (
                                            `不足 ${Math.abs(r.exactPillDiff)} 個` + (r.remainder > 0 ? ` (余り ${r.remainder} 個)` : '')
                                        ) : r.exactPillDiff > 0 ? (
                                            `余り ${r.exactPillDiff} 個`
                                        ) : '充足'
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {targetDate && results.some(r => r.exactPillDiff !== null && r.exactPillDiff < 0) && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: 'hsl(var(--primary) / 0.05)', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.1)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'hsl(var(--primary))' }}>💡 医師への調整提案のヒント</h4>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                        次回受診日の <b>{formatDateLocal(parseLocalDate(targetDate))}</b> まで揃えるには、
                        {results.filter(r => r.exactPillDiff !== null && r.exactPillDiff < 0).map((r, idx) => {
                            const shortageDays = Math.ceil(Math.abs(r.exactPillDiff) / r.dosePerDay);
                            const prescribedPills = shortageDays * r.dosePerDay;
                            return (
                                <span key={r.id}>
                                    {idx > 0 && '、'}<b>{r.name || `薬剤${r.originalIndex + 1}`}</b> を <b>{shortageDays}日分 ({prescribedPills}個)</b>
                                </span>
                            );
                        })} の処方追加、または他の残薬との調整が必要です。
                    </p>
                </div>
            )}
        </div>
    );
}
