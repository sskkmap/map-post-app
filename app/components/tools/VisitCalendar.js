'use client';

import React, { useState, useMemo } from 'react';

/**
 * VisitCalendar: 訪問件数表示付きのカレンダーコンポーネント
 */
export default function VisitCalendar({ selectedDate, onDateSelect, patients, schedules }) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const [y, m] = selectedDate.split('-').map(Number);
        return new Date(y, m - 1, 1);
    });

    const formatDateLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 日付ごとの訪問件数・タスク件数を集計
    const visitCounts = useMemo(() => {
        const counts = {};
        schedules.forEach(s => {
            const patient = patients.find(p => p.id === s.patientId);
            if (patient && !patient.deleted) {
                if (!counts[s.date]) counts[s.date] = { patientCount: 0, taskCount: 0 };
                if (patient.type === 'task') {
                    counts[s.date].taskCount++;
                } else {
                    counts[s.date].patientCount++;
                }
            }
        });
        return counts;
    }, [schedules, patients]);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    // 表示可能な範囲（1ヶ月前〜半年後）を計算
    const minMonth = new Date();
    minMonth.setMonth(minMonth.getMonth() - 1);
    minMonth.setDate(1);
    minMonth.setHours(0, 0, 0, 0);

    const maxMonth = new Date();
    maxMonth.setMonth(maxMonth.getMonth() + 6);
    maxMonth.setDate(1);
    maxMonth.setHours(0, 0, 0, 0);

    const isPrevDisabled = year === minMonth.getFullYear() && month <= minMonth.getMonth();
    const isNextDisabled = year === maxMonth.getFullYear() && month >= maxMonth.getMonth();

    const changeMonth = (offset) => {
        const next = new Date(year, month + offset, 1);
        if (next < minMonth || next > maxMonth) return;
        setCurrentMonth(next);
    };

    return (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid hsl(var(--primary) / 0.1)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <button onClick={() => changeMonth(-1)} disabled={isPrevDisabled} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: isPrevDisabled ? 'not-allowed' : 'pointer', opacity: isPrevDisabled ? 0.2 : 1 }} className={!isPrevDisabled ? "hover:bg-secondary/20 transition-colors" : ""}>◀</button>
                <div style={{ textAlign: 'center' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>{year}年 {month + 1}月</h4>

                </div>
                <button onClick={() => changeMonth(1)} disabled={isNextDisabled} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', cursor: isNextDisabled ? 'not-allowed' : 'pointer', opacity: isNextDisabled ? 0.2 : 1 }} className={!isNextDisabled ? "hover:bg-secondary/20 transition-colors" : ""}>▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {['日', '月', '火', '水', '木', '金', '土'].map((w, idx) => (
                    <div key={w} style={{
                        textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold',
                        color: idx === 0 ? '#ff4d4d' : idx === 6 ? '#4d79ff' : 'inherit',
                        opacity: 0.6, paddingBottom: '6px'
                    }}>
                        {w}
                    </div>
                ))}

                {days.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} />;

                    const dateKey = formatDateLocal(date);
                    const isSelected = dateKey === selectedDate;
                    const isToday = date.toDateString() === new Date().toDateString();
                    const counts = visitCounts[dateKey] || { patientCount: 0, taskCount: 0 };
                    const hasData = counts.patientCount > 0 || counts.taskCount > 0;

                    return (
                        <button
                            key={dateKey}
                            onClick={() => onDateSelect(dateKey)}
                            style={{
                                position: 'relative',
                                minHeight: '64px',
                                padding: '6px',
                                borderRadius: '10px',
                                background: isSelected ? 'hsl(var(--primary) / 0.15)' : 'white',
                                border: isSelected ? '2px solid hsl(var(--primary))' : isToday ? '1px solid hsl(var(--primary) / 0.4)' : '1px solid hsl(var(--secondary) / 0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: (i % 7 === 0) ? '#ff4d4d' : (i % 7 === 6) ? '#4d79ff' : 'inherit',
                                marginBottom: 'auto'
                            }}>
                                {date.getDate()}
                            </span>

                            {hasData && (
                                <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                                    {counts.patientCount > 0 && (
                                        <span style={{
                                            background: 'hsl(var(--primary))',
                                            color: 'white',
                                            fontSize: '0.55rem',
                                            padding: '1px 4px',
                                            borderRadius: '4px',
                                            fontWeight: 'black',
                                            width: '100%',
                                            textAlign: 'center'
                                        }}>
                                            患者 {counts.patientCount}件
                                        </span>
                                    )}
                                    {counts.taskCount > 0 && (
                                        <span style={{
                                            background: '#3b82f6', // blue-500
                                            color: 'white',
                                            fontSize: '0.55rem',
                                            padding: '1px 4px',
                                            borderRadius: '4px',
                                            fontWeight: 'black',
                                            width: '100%',
                                            textAlign: 'center'
                                        }}>
                                            タスク {counts.taskCount}件
                                        </span>
                                    )}
                                </div>
                            )}

                            {isToday && <div style={{ position: 'absolute', top: '4px', right: '4px', width: '4px', height: '4px', background: 'hsl(var(--primary))', borderRadius: '50%' }} />}
                        </button>
                    );
                })}
            </div>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 'bold', marginTop: '0.25rem' }}>表示範囲: 1ヶ月前 〜 6ヶ月後を読み取って表示しています</div>
        </div>

    );
}
