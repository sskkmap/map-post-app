'use client';

import React, { useState } from 'react';

const cpDrugs = [
    { id: 'asenapine', name: 'アセナピン', products: 'シクレスト', equivalent: 2.5 },
    { id: 'aripiprazole', name: 'アリピプラゾール', products: 'エビリファイ', equivalent: 4 },
    { id: 'oxypertine', name: 'オキシペルチン', products: 'ホーリット', equivalent: 80 },
    { id: 'olanzapine', name: 'オランザピン', products: 'ジプレキサ', equivalent: 2.5 },
    { id: 'carpipramine', name: 'カルピプラミン', products: 'デフェクトン（販売中止）', equivalent: 100 },
    { id: 'quetiapine', name: 'クエチアピン', products: 'セロクエル', equivalent: 66 },
    { id: 'clocapramine', name: 'クロカプラミン', products: 'クロフェクトン', equivalent: 40 },
    { id: 'clozapine', name: 'クロザピン', products: 'クロザリル', equivalent: 50 },
    { id: 'clothiapine', name: 'クロチアピン', products: 'デリトン（販売中止）', equivalent: 40 },
    { id: 'chlorpromazine', name: 'クロルプロマジン', products: 'ウインタミン、コントミン', equivalent: 100 },
    { id: 'spiperone', name: 'スピペロン', products: 'スピロピタン', equivalent: 1 },
    { id: 'sultopride', name: 'スルトプリド', products: 'バルネチール', equivalent: 200 },
    { id: 'sulpiride', name: 'スルピリド', products: 'ドグマチール', equivalent: 200 },
    { id: 'zotepine', name: 'ゾテピン', products: 'ロドピン', equivalent: 66 },
    { id: 'tiapride', name: 'チアプリド', products: 'グラマリール', equivalent: 100 },
    { id: 'thiothixene', name: 'チオチキセン', products: 'ナーベン（販売中止）', equivalent: 3.3 },
    { id: 'thioridazine', name: 'チオリダジン', products: 'メレリル（販売中止）', equivalent: 100 },
    { id: 'timiperone', name: 'チミペロン', products: 'トロペロン', equivalent: 1.3 },
    { id: 'trifluoperazine', name: 'トリフロペラジン', products: 'トリフロペラジン（販売中止）', equivalent: 5 },
    { id: 'nemonapride', name: 'ネモナプリド', products: 'エミレース', equivalent: 4.5 },
    { id: 'paliperidone', name: 'パリペリドン', products: 'インヴェガ', equivalent: 1.5 },
    { id: 'haloperidol', name: 'ハロペリドール', products: 'セレネース', equivalent: 2 },
    { id: 'pipamperone', name: 'ピパンペロン', products: 'プロピタン', equivalent: 200 },
    { id: 'pimozide', name: 'ピモジド', products: 'オーラップ（販売中止）', equivalent: 4 },
    { id: 'fluphenazine', name: 'フルフェナジン', products: 'フルメジン', equivalent: 2 },
    { id: 'brexpiprazole', name: 'ブレクスピプラゾール', products: 'レキサルティ', equivalent: 0.5 },
    { id: 'prochlorperazine', name: 'プロクロルペラジン', products: 'ノバミン', equivalent: 15 },
    { id: 'blonanserin', name: 'ブロナンセリン', products: 'ロナセン', equivalent: 4 },
    { id: 'blonanserin_tape', name: 'ブロナンセリン（貼付剤）', products: 'ロナセンテープ', equivalent: 20 },
    { id: 'propericiazine', name: 'プロペリシアジン', products: 'ニューレプチル', equivalent: 20 },
    { id: 'bromperidol', name: 'ブロムペリドール', products: 'インプロメン', equivalent: 2 },
    { id: 'perazine', name: 'ぺラジン', products: 'プシトミン（販売中止）', equivalent: 100 },
    { id: 'perphenazine', name: 'ペルフェナジン', products: 'ピーゼットシー', equivalent: 10 },
    { id: 'perospirone', name: 'ペロスピロン', products: 'ルーラン', equivalent: 8 },
    { id: 'mosapramine', name: 'モサプラミン', products: 'クレミン', equivalent: 33 },
    { id: 'moperone', name: 'モペロン', products: 'ルバトレン（販売中止）', equivalent: 12.5 },
    { id: 'risperidone', name: 'リスペリドン', products: 'リスパダール', equivalent: 1 },
    { id: 'lurasidone', name: 'ルラシドン', products: 'ラツーダ', equivalent: 10 },
    { id: 'reserpine', name: 'レセルピン', products: 'アポプロン', equivalent: 0.15 },
    { id: 'levomepromazine', name: 'レボメプロマジン', products: 'ヒルナミン、レボトミン', equivalent: 100 }
];

export default function CpCalc() {
    const [doses, setDoses] = useState({});

    const handleInputChange = (id, value) => {
        setDoses(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleClear = () => {
        setDoses({});
    };

    // Calculate individual CPs and total
    let totalCp = 0;
    const cpValues = {};

    cpDrugs.forEach(drug => {
        const val = parseFloat(doses[drug.id]);
        if (!isNaN(val) && val > 0) {
            const cp = (val / drug.equivalent) * 100;
            cpValues[drug.id] = cp;
            totalCp += cp;
        }
    });

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, color: 'hsl(var(--primary))', fontSize: '1.5rem', borderBottom: '2px solid hsl(var(--primary) / 0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🧠 抗精神病薬の等価換算(CP換算)</span>
                <button
                    onClick={handleClear}
                    className="btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' }}
                >
                    クリア
                </button>
            </h2>

            <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>
                患者が服用している各抗精神病薬の投与量（mg）を入力すると、それぞれのCP換算値および総CP等価量が自動で計算されます。<br />
                <span style={{ fontSize: '0.85rem' }}>※出典：稲垣＆稲田版 抗精神病薬経口製剤・貼付剤の等価換算表 </span>
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.75rem', borderBottom: '2px solid hsl(var(--primary) / 0.2)' }}>一般名</th>
                            <th style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.75rem', borderBottom: '2px solid hsl(var(--primary) / 0.2)' }}>主要な商品名</th>
                            <th style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.75rem', borderBottom: '2px solid hsl(var(--primary) / 0.2)', textAlign: 'center' }}>換算基準<br /><span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(CP100mg相当)</span></th>
                            <th style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.75rem', borderBottom: '2px solid hsl(var(--primary) / 0.2)', width: '150px' }}>入力欄 (mg)</th>
                            <th style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '0.75rem', borderBottom: '2px solid hsl(var(--primary) / 0.2)', textAlign: 'right', width: '120px' }}>CP換算 (mg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cpDrugs.map((drug) => {
                            const val = doses[drug.id] || '';
                            const cpVal = cpValues[drug.id];
                            const hasValue = cpVal !== undefined;

                            return (
                                <tr key={drug.id} style={{
                                    borderBottom: '1px solid hsl(var(--border))',
                                    backgroundColor: hasValue ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                                    transition: 'background-color 0.2s'
                                }}>
                                    <td style={{ padding: '0.75rem', fontWeight: hasValue ? 'bold' : 'normal' }}>{drug.name}</td>
                                    <td style={{ padding: '0.75rem', color: 'hsl(var(--secondary-foreground))' }}>{drug.products}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'center', opacity: 0.8 }}>{drug.equivalent}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <input
                                            type="number"
                                            value={val}
                                            onChange={(e) => handleInputChange(drug.id, e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            step="any"
                                            style={{
                                                width: '100%',
                                                padding: '0.4rem',
                                                borderRadius: '4px',
                                                border: hasValue ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--secondary))',
                                                fontSize: '0.95rem',
                                                background: 'var(--background)'
                                            }}
                                        />
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: hasValue ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                                        {hasValue ? (Math.round(cpVal * 10) / 10).toString() : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '1.5rem', background: 'hsl(var(--primary) / 0.1)', borderRadius: '8px', border: '1px solid hsl(var(--primary) / 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'hsl(var(--primary))' }}>経口製剤のCP換算値は</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>
                        {Math.round(totalCp * 10) / 10}
                    </div>
                    <span style={{ fontSize: '1.2rem', color: 'hsl(var(--primary))', fontWeight: 'bold' }}>mg です。</span>
                </div>
            </div>

        </div>
    );
}
