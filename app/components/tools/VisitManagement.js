'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { deriveKey, encryptData, decryptData, arrayBufferToBase64, base64ToUint8Array, generateId } from '../../lib/visit-management/crypto';
import { setData, getData, clearAllData } from '../../lib/visit-management/db';
import { getScheduleRange, syncGlobalSchedules } from '../../lib/visit-management/schedule';
import VisitCalendar from './VisitCalendar';



/**
 * 訪問処方管理メインコンポーネント
 */
export default function VisitManagement({ onLoginStateChange }) {
    // --- ステート管理 ---
    const [passphrase, setPassphrase] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);

    // ログイン状態の変化を親に通知
    useEffect(() => {
        if (onLoginStateChange) {
            onLoginStateChange(isUnlocked);
        }
    }, [isUnlocked, onLoginStateChange]);
    const [encryptionKey, setEncryptionKey] = useState(null);
    const [appData, setAppData] = useState({
        patients: [],
        schedules: [],
        logs: [],
        masterDeviceId: null,
        dataVersion: 1
    });
    const [deviceId, setDeviceId] = useState(null);
    const [viewMode, setViewMode] = useState('calendar'); // calendar | daily | patients | logs | settings
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSecure, setIsSecure] = useState(true);
    const [hasExistingData, setHasExistingData] = useState(false);
    const [isSetupOpen, setIsSetupOpen] = useState(false);

    // --- 新規追加・編集ステート ---
    const [editingPatient, setEditingPatient] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    // 曜日・週選択状態（React状態で管理して視覚フィードバック）
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
    const [selectedWeeks, setSelectedWeeks] = useState([]);
    const [scheduleMode, setScheduleMode] = useState('monthly_week'); // 'monthly_week' | 'interval'
    const [intervalWeeks, setIntervalWeeks] = useState(2);
    // 別日対応ステート
    const [rescheduleScheduleId, setRescheduleScheduleId] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    // 患者検索ステート
    const [searchTerm, setSearchTerm] = useState('');

    // --- 新規追加: 折りたたみ状態 ---
    const [isPatientsExpanded, setIsPatientsExpanded] = useState(false);
    const [isTasksExpanded, setIsTasksExpanded] = useState(false);

    // --- 新規追加: モーダル入力中の名前（重複チェック用） ---
    const [modalInputName, setModalInputName] = useState('');

    // モーダルが開かれたとき、選択状態を初期化
    useEffect(() => {
        if (isEditModalOpen && editingPatient) {
            setModalInputName(editingPatient.name || '');
            setSelectedDayOfWeek(editingPatient.dayOfWeek ?? 1);
            if (editingPatient.intervalWeeks > 1 || editingPatient.weekNumber === 'interval') {
                setScheduleMode('interval');
                setIntervalWeeks(editingPatient.intervalWeeks || 2);
                setSelectedWeeks([]);
            } else {
                setScheduleMode('monthly_week');
                setIntervalWeeks(2);
                setSelectedWeeks(editingPatient.weekNumbers ?? []);
            }
        }
    }, [isEditModalOpen, editingPatient?.id]);

    const fileInputRef = useRef(null);

    const handleExport = async () => {
        try {
            const ExcelJS = await import('exceljs');
            const wb = new ExcelJS.Workbook();
            try {
                // テンプレートファイルをフェッチ
                const res = await fetch('/visit_management_data_2026-07-04.xlsx');
                if (res.ok) {
                    const ab = await res.arrayBuffer();
                    await wb.xlsx.load(ab);
                } else {
                    throw new Error('Template not found');
                }
            } catch (err) {
                console.error('Failed to load template:', err);
                alert('テンプレートファイルの読み込みに失敗しました。');
                return;
            }

            const daysMap = ['日', '月', '火', '水', '木', '金', '土'];
            const statusMap = { 'active': '稼働中', 'paused': '一時停止', 'ended': '終了' };
            const calcMap = { 'exact': 'きっかり当日', 'near_day': '近接曜日合わせ' };

            const fillSheet = (sheetName, data) => {
                const ws = wb.getWorksheet(sheetName);
                if (!ws) return;
                
                // 既存のデータをクリア (ヘッダー1行目以外)
                ws.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        row.eachCell((cell) => {
                            cell.value = null;
                        });
                    }
                });

                // 新しいデータを書き込み
                data.forEach((dataRow, i) => {
                    const rowNumber = i + 2;
                    const row = ws.getRow(rowNumber);
                    dataRow.forEach((cellValue, j) => {
                        const colNumber = j + 1;
                        const cell = row.getCell(colNumber);
                        cell.value = cellValue;
                    });
                    row.commit();
                });

                // exceljsのバグで別シート参照(=リスト!$A:$A)の入力規則が読み込み時に消失するため、F列に再設定する
                if (sheetName === '定期患者' || sheetName === 'タスク') {
                    ws.dataValidations.add('F2:F1000', {
                        type: 'list',
                        allowBlank: true,
                        showErrorMessage: true,
                        formulae: ['リスト!$A:$A']
                    });
                }
            };

            // 1. 定期患者 (periodic)
            const periodicData = appData.patients.filter(p => !p.deleted && p.type === 'periodic').map(p => [
                p.id, p.name, p.memo || '', p.startBaseDate || '', p.dayOfWeek !== undefined ? daysMap[p.dayOfWeek] : '', (p.intervalWeeks > 1 || p.weekNumber === 'interval') ? `${p.intervalWeeks || 2}週間毎` : (p.weekNumbers?.join(',') || p.weekNumber || ''), statusMap[p.status] || '稼働中'
            ]);
            fillSheet('定期患者', periodicData);

            // 2. 単発患者 (single)
            const singleData = appData.patients.filter(p => !p.deleted && p.type === 'single').map(p => [
                p.id, p.name, p.memo || '', p.singleBaseDate || '', p.prescriptionDays || '', calcMap[p.calcMode] || 'きっかり当日', statusMap[p.status] || '稼働中'
            ]);
            fillSheet('単発患者', singleData);

            // 3. タスク (task)
            const taskData = appData.patients.filter(p => !p.deleted && p.type === 'task').map(p => [
                p.id, p.name, p.memo || '', p.startBaseDate || '', p.dayOfWeek !== undefined ? daysMap[p.dayOfWeek] : '', (p.intervalWeeks > 1 || p.weekNumber === 'interval') ? `${p.intervalWeeks || 2}週間毎` : (p.weekNumbers?.join(',') || p.weekNumber || ''), statusMap[p.status] || '稼働中'
            ]);
            fillSheet('タスク', taskData);

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `visit_management_data_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export Error:', e);
            alert('出力に失敗しました');
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const XLSX = await import('xlsx');
            const reader = new FileReader();
            reader.onload = async (event) => {
                const data = new Uint8Array(event.target.result);
                const wb = XLSX.read(data, { type: 'array' });

                let newPatients = [...appData.patients];
                let importedCount = 0;
                let updatedCount = 0;

                const parseExcelDate = (excelDate) => {
                    if (!excelDate) return new Date().toISOString().split('T')[0];
                    if (typeof excelDate === 'number') {
                        const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                        return jsDate.toISOString().split('T')[0];
                    }
                    return String(excelDate).trim();
                };

                const dayObj = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
                const parseDayOfWeek = (val) => {
                    if (val === undefined || val === null || val === '') return 0;
                    const str = String(val).replace('曜日', '').replace('曜', '').trim();
                    return dayObj[str] !== undefined ? dayObj[str] : (parseInt(str, 10) || 0);
                };

                const parseWeekOrInterval = (val) => {
                    if (!val) return { weekNumbers: [1], intervalWeeks: 1, weekNumber: '1' };
                    const rawStr = String(val).trim();
                    
                    const intervalMatch = rawStr.match(/([0-9０-９]+)\s*週(?:間)?毎/);
                    if (intervalMatch) {
                        const numStr = intervalMatch[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
                        const interval = parseInt(numStr, 10) || 1;
                        return { weekNumbers: [], intervalWeeks: interval, weekNumber: 'interval' };
                    }

                    const str = rawStr.replace(/第/g, '').replace(/週/g, '').trim();
                    const nums = str.split(/[、,]/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
                    const wNums = nums.length > 0 ? nums : [1];
                    return { weekNumbers: wNums, intervalWeeks: 1, weekNumber: wNums[0].toString() };
                };

                const parseStatus = (val) => {
                    if (!val) return 'active';
                    const str = String(val).trim();
                    if (str === '稼働中' || str === 'active') return 'active';
                    if (str === '一時停止' || str === 'paused') return 'paused';
                    if (str === '終了' || str === 'ended') return 'ended';
                    return 'active';
                };

                const parseCalcMode = (val) => {
                    if (!val) return 'exact';
                    const str = String(val).trim();
                    if (str === '近接曜日合わせ' || str === 'near_day') return 'near_day';
                    if (str === 'きっかり当日' || str === 'exact') return 'exact';
                    return 'exact';
                };

                const processSheet = (sheetName, type, mapper) => {
                    const ws = wb.Sheets[sheetName];
                    if (!ws) return;
                    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    for (let i = 1; i < json.length; i++) {
                        const row = json[i];
                        if (!row || !row.length || !row[1]) continue; // 氏名がない場合はスキップ

                        const rowId = row[0] ? String(row[0]).trim() : '';
                        const existingIdx = rowId ? newPatients.findIndex(p => p.id === rowId) : -1;
                        const patientData = mapper(row);

                        if (existingIdx >= 0) {
                            newPatients[existingIdx] = { ...newPatients[existingIdx], ...patientData, deleted: false, active: true, updatedAt: new Date().toISOString() };
                            updatedCount++;
                        } else {
                            newPatients.push({ ...patientData, id: rowId || generateId(), type, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), active: true, deleted: false });
                            importedCount++;
                        }
                    }
                };

                processSheet('定期患者', 'periodic', (row) => {
                    const parsedWeekInfo = parseWeekOrInterval(row[5]);
                    return {
                        name: String(row[1] || ''),
                        memo: String(row[2] || ''),
                        startBaseDate: parseExcelDate(row[3]),
                        dayOfWeek: parseDayOfWeek(row[4]),
                        weekNumbers: parsedWeekInfo.weekNumbers,
                        weekNumber: parsedWeekInfo.weekNumber,
                        intervalWeeks: parsedWeekInfo.intervalWeeks,
                        status: parseStatus(row[6])
                    };
                });

                processSheet('単発患者', 'single', (row) => {
                    const baseDateStr = parseExcelDate(row[3]);
                    const prescriptionDays = parseInt(row[4], 10) || 28;
                    const calcMode = String(row[5] || 'exact');
                    const baseDate = new Date(baseDateStr);
                    const targetDateObj = new Date(baseDate);
                    targetDateObj.setDate(baseDate.getDate() + prescriptionDays);
                    if (calcMode === 'near_day') {
                        const targetDay = baseDate.getDay();
                        while (targetDateObj.getDay() !== targetDay) targetDateObj.setDate(targetDateObj.getDate() - 1);
                    }
                    const targetDate = targetDateObj.toISOString().split('T')[0];

                    return {
                        name: String(row[1] || ''),
                        memo: String(row[2] || ''),
                        singleBaseDate: baseDateStr,
                        prescriptionDays,
                        calcMode: parseCalcMode(row[5]),
                        targetDate,
                        status: parseStatus(row[6])
                    };
                });

                processSheet('タスク', 'task', (row) => {
                    const parsedWeekInfo = parseWeekOrInterval(row[5]);
                    return {
                        name: String(row[1] || ''),
                        memo: String(row[2] || ''),
                        startBaseDate: parseExcelDate(row[3]),
                        dayOfWeek: parseDayOfWeek(row[4]),
                        weekNumbers: parsedWeekInfo.weekNumbers,
                        weekNumber: parsedWeekInfo.weekNumber,
                        intervalWeeks: parsedWeekInfo.intervalWeeks,
                        status: parseStatus(row[6])
                    };
                });

                const newSchedules = syncGlobalSchedules(newPatients, appData.schedules, getScheduleRange());

                await commitData({
                    ...appData,
                    patients: newPatients,
                    schedules: newSchedules,
                    logs: [...appData.logs, {
                        id: generateId(), patientId: 'import',
                        actionType: 'import',
                        memo: `Excelからデータをインポートしました (新規: ${importedCount}件, 更新: ${updatedCount}件)`,
                        deviceId, createdAt: new Date().toISOString()
                    }]
                });

                alert(`インポートが完了しました。\n新規: ${importedCount}件\n更新: ${updatedCount}件`);
            };
            reader.readAsArrayBuffer(file);
        } catch (e) {
            console.error('Import Error:', e);
            alert('インポートに失敗しました');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- 初期化 ---
    useEffect(() => {
        // Web Crypto API (subtle) の利用可否チェック
        if (typeof window !== 'undefined' && !window.crypto?.subtle) {
            setIsSecure(false);
            setError('このブラウザ環境では暗号化機能（Web Crypto API）を利用できません。HTTPS通信または localhost でのアクセスが必要です。');
            setLoading(false); // Stop loading if not secure
            return; // Exit useEffect early
        }

        const init = async () => {
            let storedId = localStorage.getItem('visit_management_device_id');
            if (!storedId) {
                storedId = generateId();
                localStorage.setItem('visit_management_device_id', storedId);
            }
            setDeviceId(storedId);

            const encryptedPackage = await getData('encrypted_package');
            setHasExistingData(!!encryptedPackage);
            setLoading(false);
        };
        init();
    }, []);

    // --- 補助: データの保存 ---
    const commitData = async (newData) => {
        // 履歴（ログ）が溜まりすぎて重くなるのを防ぐため、最新の500件のみを保持する
        const MAX_LOGS = 500;
        if (newData.logs && newData.logs.length > MAX_LOGS) {
            newData.logs = newData.logs.slice(-MAX_LOGS);
        }

        setAppData(newData);
        const stored = await getData('encrypted_package');
        if (stored && encryptionKey) {
            const salt = base64ToUint8Array(stored.salt);
            await saveData(newData, encryptionKey, salt);
        }
    };

    const saveData = async (data, key, salt) => {
        const encrypted = await encryptData(data, key);
        await setData('encrypted_package', {
            encryptedData: arrayBufferToBase64(encrypted.encrypted),
            iv: arrayBufferToBase64(encrypted.iv),
            salt: arrayBufferToBase64(salt),
            dataVersion: data.dataVersion,
            masterDeviceId: data.masterDeviceId,
            lastUpdated: new Date().toISOString()
        });
    };

    // --- アクション: 認証系 ---
    const validatePassphrase = (pw) => {
        // 8文字以上、英字と数字の両方を含む
        const hasLetter = /[a-zA-Z]/.test(pw);
        const hasNumber = /[0-9]/.test(pw);
        return pw.length >= 8 && hasLetter && hasNumber;
    };
    const handleUnlock = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const pkg = await getData('encrypted_package');
            const salt = base64ToUint8Array(pkg.salt);
            const key = await deriveKey(passphrase, salt);
            const data = await decryptData(base64ToUint8Array(pkg.encryptedData), key, base64ToUint8Array(pkg.iv));

            setAppData(data);
            setEncryptionKey(key);
            setIsUnlocked(true);

            const range = getScheduleRange();
            const updated = syncGlobalSchedules(data.patients, data.schedules, range);
            if (updated.length !== data.schedules.length) {
                commitData({ ...data, schedules: updated });
            }
        } catch (err) {
            setError('パスフレーズが正しくないか、復号に失敗しました。');
        } finally { setLoading(false); }
    };

    const handleSetup = async (e) => {
        if (e) e.preventDefault();

        // 0. 未入力チェック
        if (!passphrase || passphrase.trim() === '') {
            alert('パスフレーズが入力されていないため、削除できませんでした。入力してから再度お試しください。');
            return;
        }

        // 1. 確認ポップアップ
        if (hasExistingData) {
            const confirmed = window.confirm('【最終確認】既存のデータをすべて削除して新しくセットアップします。本当によろしいですか？');
            if (!confirmed) return;
        }

        // 2. パスフレーズバリデーション
        if (!validatePassphrase(passphrase)) {
            setError('パスフレーズは英字と数字を含む8文字以上である必要があります。');
            alert('入力されたパスフレーズが条件（英字と数字を含む8文字以上）を満たしていないため、削除できませんでした。入力内容を確認してから再度お試しください。');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // 3. データクリア
            // データベース内の全レコードを削除
            await clearAllData();

            // デバイスIDもリセット
            const newDeviceId = generateId();
            localStorage.setItem('visit_management_device_id', newDeviceId);
            setDeviceId(newDeviceId);

            // 4. 新しいデータで初期化
            const initialData = {
                patients: [], schedules: [],
                logs: [{ id: generateId(), actionType: 'init', memo: 'システム再初期化', deviceId: newDeviceId, createdAt: new Date().toISOString() }],
                masterDeviceId: newDeviceId, dataVersion: 1, lastUpdated: new Date().toISOString()
            };

            const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
            const newKey = await deriveKey(passphrase, newSalt);
            await saveData(initialData, newKey, newSalt);

            // 5. 完了処理
            alert('セットアップが完了しました。ページを再読み込みします。');
            window.location.href = window.location.pathname; // 強制リロード

        } catch (err) {
            console.error('Setup Error:', err);
            setError('エラーが発生しました：' + (err.message || 'ブラウザのストレージを確認してください'));
        } finally {
            setLoading(false);
        }
    };

    // --- アクション: 患者管理 ---
    const handleSavePatient = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const type = fd.get('type'); // periodic | single

        let patient = {
            id: editingPatient?.id || generateId(),
            name: fd.get('name'),
            memo: fd.get('memo') || '',
            type: type,
            status: fd.get('status') || 'active',
            updatedAt: new Date().toISOString(),
            active: true,
            deleted: false
        };

        if (type === 'periodic' || type === 'task') {
            const isInterval = scheduleMode === 'interval';
            const weekNumbers = isInterval ? [] : (selectedWeeks.length > 0 ? [...selectedWeeks] : []);
            patient = {
                ...patient,
                dayOfWeek: selectedDayOfWeek,
                weekNumbers: weekNumbers,
                // 下位互換性のためのweekNumber (最初の1つ)
                weekNumber: isInterval ? 'interval' : (weekNumbers[0] || 'every'),
                intervalWeeks: isInterval ? intervalWeeks : 1, // 第N週指定がある場合は1で固定し、スケジュールロジック側に任せる
                startBaseDate: fd.get('startBaseDate')
            };

        } else {
            // 単発
            const baseDateStr = fd.get('singleBaseDate');
            const prescriptionDays = parseInt(fd.get('prescriptionDays'));
            const calcMode = fd.get('calcMode'); // exact | near_day

            const baseDate = new Date(baseDateStr);
            const targetDate = new Date(baseDate);
            targetDate.setDate(baseDate.getDate() + prescriptionDays);

            if (calcMode === 'near_day') {
                const targetDay = baseDate.getDay();
                // 一番近いその前の同じ曜日を探す
                while (targetDate.getDay() !== targetDay) {
                    targetDate.setDate(targetDate.getDate() - 1);
                }
            }

            patient = {
                ...patient,
                targetDate: targetDate.toISOString().split('T')[0],
                prescriptionDays,
                calcMode,
                singleBaseDate: baseDateStr
            };
        }

        const newPatients = editingPatient?.id ? appData.patients.map(p => p.id === patient.id ? patient : p) : [...appData.patients, patient];
        const newSchedules = syncGlobalSchedules(newPatients, appData.schedules, getScheduleRange());

        commitData({
            ...appData,
            patients: newPatients,
            schedules: newSchedules,
            logs: [...appData.logs, {
                id: generateId(), patientId: patient.id,
                actionType: editingPatient?.id ? 'edit' : 'register',
                memo: `[${type === 'periodic' ? '定期' : '単発'}] ${patient.name} さんを${editingPatient?.id ? '編集' : '登録'}しました`,
                deviceId, createdAt: new Date().toISOString()
            }]
        });
        setIsEditModalOpen(false);
    };

    const handleDeletePatient = async (patientId) => {
        const patient = appData.patients.find(p => p.id === patientId);
        if (!patient) return;

        if (!window.confirm(`${patient.name} さんの登録を削除しますか？（スケジュールも削除されます）`)) return;

        const newPatients = appData.patients.map(p => p.id === patientId ? { ...p, deleted: true, updatedAt: new Date().toISOString() } : p);
        const newSchedules = syncGlobalSchedules(newPatients, appData.schedules, getScheduleRange());

        commitData({
            ...appData,
            patients: newPatients,
            schedules: newSchedules,
            logs: [...appData.logs, {
                id: generateId(), patientId,
                actionType: 'delete',
                memo: `${patient.name} さんの登録を削除しました`,
                deviceId, createdAt: new Date().toISOString()
            }]
        });
        setIsEditModalOpen(false);
    };

    // --- アクション:本日の処方箋到着確認ステータス更新 ---
    const updateScheduleStatus = (scheduleId, newStatus, memo = '') => {
        const schedule = appData.schedules.find(s => s.id === scheduleId);
        if (!schedule) return;

        const patient = appData.patients.find(p => p.id === schedule.patientId);

        const newSchedules = appData.schedules.map(s =>
            s.id === scheduleId ? { ...s, status: newStatus, updatedAt: new Date().toISOString() } : s
        );

        commitData({
            ...appData,
            schedules: newSchedules,
            logs: [...appData.logs, {
                id: generateId(), patientId: schedule.patientId,
                actionType: newStatus,
                memo: `${patient?.name} さんのステータスを [${newStatus}] に変更しました${memo ? ': ' + memo : ''}`,
                deviceId, createdAt: new Date().toISOString()
            }]
        });
    };

    // 別日対応: スケジュール日付を変更してステータスをrescheduledに更新
    const handleRescheduleConfirm = (scheduleId) => {
        if (!rescheduleDate) return;
        const schedule = appData.schedules.find(s => s.id === scheduleId);
        if (!schedule) return;
        const patient = appData.patients.find(p => p.id === schedule.patientId);

        const newSchedules = appData.schedules.map(s =>
            s.id === scheduleId
                ? { ...s, status: 'not_arrived', date: rescheduleDate, updatedAt: new Date().toISOString() }
                : s
        );

        commitData({
            ...appData,
            schedules: newSchedules,
            logs: [...appData.logs, {
                id: generateId(), patientId: schedule.patientId,
                actionType: 'rescheduled',
                memo: `${patient?.name} さんの訪問日を [${rescheduleDate}] に変更し、ステータスを未到着にリセットしました`,
                deviceId, createdAt: new Date().toISOString()
            }]
        });
        setRescheduleScheduleId(null);
        setRescheduleDate('');
    };

    // --- 算出プロパティ ---
    const dailySchedules = useMemo(() => {
        return appData.schedules
            .filter(s => s.date === selectedDate)
            .map(s => ({ ...s, patient: appData.patients.find(p => p.id === s.patientId) }))
            .filter(s => s.patient && !s.patient.deleted);
    }, [appData.schedules, appData.patients, selectedDate]);

    // --- レンダリング ---
    if (loading) return <div className="p-8 text-center text-primary animate-pulse">読み込み中...</div>;

    if (!isUnlocked) {
        return (
            <div className="max-w-md mx-auto p-8 glass-panel mt-10 shadow-2xl border-primary/20">
                <h2 className="text-3xl font-extrabold mb-8 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">訪問処方管理</h2>
                <form onSubmit={handleUnlock} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2 opacity-80">
                            パスワード <span className="text-[10px] text-primary ml-2">※英字と数字を組み合わせた8文字以上</span>
                        </label>
                        <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} required
                            className="w-full p-4 rounded-xl bg-secondary/30 border border-primary/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            placeholder="••••••••" />
                    </div>
                    {error && <p className="text-destructive text-sm font-medium animate-bounce text-center">{error}</p>}

                    {hasExistingData ? (
                        <button type="submit" className="w-full py-4 rounded-xl bg-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" style={{ color: '#111' }}>
                            ロックを解除
                        </button>
                    ) : (
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 text-center space-y-2">
                            <p className="text-xs font-bold text-primary">データが見つかりません</p>
                            <p className="text-[10px] opacity-60">下のボタンから「新規セットアップ」を行ってください</p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-primary/10">
                        <button type="button" onClick={() => setIsSetupOpen(!isSetupOpen)}
                            className="w-full py-2 text-xs font-bold opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {isSetupOpen ? '▼ 管理メニューを閉じる' : '▶ セットアップ・初期化'}
                        </button>

                        {isSetupOpen && (
                            <div className="mt-4 p-4 bg-destructive/5 rounded-2xl border border-destructive/10 animate-in slide-in-from-top-2 duration-300">
                                <p className="text-[10px] text-destructive font-bold mb-4 text-center">
                                    ※ 既存のデータを削除して新しく作成します。<br />
                                    パスワード入力欄に「新しいパスワード」を入力してから、下のボタンをクリックしてください。<br />
                                    この操作は取り消せません。
                                </p>
                                <button type="button" onClick={handleSetup}
                                    className="w-full py-3 rounded-xl bg-destructive text-black text-sm font-bold shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    {hasExistingData ? '全データを削除して再セットアップ' : '新規セットアップを開始'}
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="visit-management-app">
            <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', padding: '0.25rem', background: 'rgba(0,0,0,0.06)', borderRadius: '1rem', overflowX: 'auto' }}>
                {[
                    { id: 'calendar', label: 'カレンダー', icon: '📅' },
                    { id: 'daily', label: '到着確認', icon: '📋' },
                    { id: 'patients', label: '患者管理', icon: '👥' },
                    { id: 'logs', label: '履歴', icon: '📜' },
                    { id: 'settings', label: '設定', icon: '⚙️' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setViewMode(tab.id)}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '0.35rem', padding: '0.6rem 0.75rem', borderRadius: '0.75rem',
                            fontWeight: 700, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
                            fontSize: '0.8rem', transition: 'all 0.2s',
                            background: viewMode === tab.id ? '#3b82f6' : 'transparent',
                            color: viewMode === tab.id ? '#ffffff' : '#1e293b',
                            boxShadow: viewMode === tab.id ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                            opacity: viewMode === tab.id ? 1 : 0.75,
                        }}>
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </nav>

            <div className="min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
                {viewMode === 'calendar' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-secondary/10 p-6 rounded-3xl gap-4">
                            <div>
                                <h3 className="text-2xl font-black">スケジュール管理</h3>
                                <p className="opacity-60 font-medium">日付を選択して詳細を確認できます</p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                className="bg-primary/10 text-primary px-6 py-2 rounded-xl font-bold hover:bg-primary/20"
                            >
                                今日
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <VisitCalendar
                                    selectedDate={selectedDate}
                                    onDateSelect={(date) => setSelectedDate(date)}
                                    patients={appData.patients}
                                    schedules={appData.schedules}
                                />
                            </div>

                            <div className="glass-panel p-6 overflow-hidden">
                                <h4 className="text-lg font-black mb-4 border-b border-primary/10 pb-2 flex items-center gap-2">
                                    <span>📅</span> {selectedDate} の予定
                                </h4>
                                {(() => {
                                    const patientsList = dailySchedules.filter(item => item.patient.type !== 'task');
                                    const tasksList = dailySchedules.filter(item => item.patient.type === 'task');

                                    if (dailySchedules.length === 0) {
                                        return <p className="text-center opacity-40 text-sm py-12">この日の訪問予定はありません</p>;
                                    }

                                    const renderItem = (item) => {
                                        const calColor = {
                                            arrived: 'bg-green-500',
                                            calling: 'bg-blue-500',
                                            rescheduled: 'bg-purple-500',
                                            not_arrived: 'bg-red-500',
                                        }[item.status] || 'bg-red-500';
                                        const calLabel = item.patient.type === 'task' ? {
                                            arrived: '済',
                                            rescheduled: '別日変更済み',
                                            not_arrived: '未実施',
                                        }[item.status] || '未実施' : {
                                            arrived: '到着済み',
                                            calling: '電話確認中',
                                            rescheduled: '別日変更済み',
                                            not_arrived: '未到着',
                                        }[item.status] || '未到着';
                                        return (
                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary/10 rounded-xl">
                                                <div className={`w-2 h-8 rounded-full ${calColor}`} />
                                                <div className="flex-1">
                                                    <div className="text-sm font-black">{item.patient.name}</div>
                                                    <div className="text-[10px] opacity-60 flex items-center gap-1.5 flex-wrap">
                                                        <span>{calLabel}</span>
                                                        {item.patient.memo && (
                                                            <>
                                                                <span className="opacity-40">|</span>
                                                                <span className="font-bold truncate max-w-[150px]">{item.patient.memo}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => setViewMode('daily')} className="text-[10px] bg-primary text-white p-1 rounded-md mb-auto mt-1">詳細</button>
                                            </div>
                                        );
                                    };

                                    return (
                                        <div className="space-y-6 overflow-y-auto max-h-[400px] no-scrollbar pr-2">
                                            {patientsList.length > 0 && (
                                                <div>
                                                    <h5 className="text-xs font-bold opacity-60 mb-3 flex items-center gap-2"><span>👥</span> 患者予定 ({patientsList.length}件)</h5>
                                                    <div className="space-y-3">
                                                        {patientsList.map(renderItem)}
                                                    </div>
                                                </div>
                                            )}
                                            {tasksList.length > 0 && (
                                                <div>
                                                    <h5 className="text-xs font-bold text-blue-500 opacity-80 mb-3 flex items-center gap-2"><span>📝</span> タスク ({tasksList.length}件)</h5>
                                                    <div className="space-y-3">
                                                        {tasksList.map(renderItem)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'daily' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-secondary/10 p-6 rounded-3xl gap-4">
                            <div>
                                <h3 className="text-2xl font-black">{selectedDate}</h3>
                                <div className="opacity-60 font-medium flex gap-3 text-sm mt-1">
                                    <span>👥 患者: {dailySchedules.filter(s => s.patient.type !== 'task').length}件</span>
                                    <span className="text-blue-500 font-bold">📝 タスク: {dailySchedules.filter(s => s.patient.type === 'task').length}件</span>
                                </div>
                            </div>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-background px-6 py-3 rounded-2xl border border-primary/20 font-bold outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer" />
                        </div>

                        {(() => {
                            const patientsList = dailySchedules.filter(item => item.patient.type !== 'task');
                            const tasksList = dailySchedules.filter(item => item.patient.type === 'task');

                            if (dailySchedules.length === 0) {
                                return (
                                    <div className="p-20 text-center opacity-40 italic border border-dashed border-primary/20 rounded-3xl">
                                        この日の訪問予定はありません
                                    </div>
                                );
                            }

                            const renderRow = (item) => {
                                const statusLabel = item.patient.type === 'task' ? {
                                    not_arrived: '未実施',
                                    arrived: '済',
                                    rescheduled: '別日変更済み',
                                }[item.status] || '未実施' : {
                                    not_arrived: '未到着',
                                    arrived: '到着済み',
                                    calling: '電話確認中',
                                    rescheduled: '別日変更済み',
                                }[item.status] || '未到着';
                                const statusColor = {
                                    not_arrived: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse',
                                    arrived: 'bg-green-500',
                                    calling: 'bg-blue-500',
                                    rescheduled: 'bg-purple-500',
                                }[item.status] || 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';
                                // 旧データ(scheduled等)は not_arrived 扱い
                                const effectiveStatus = (item.status === 'not_arrived' || item.status === 'arrived' || item.status === 'calling' || item.status === 'rescheduled')
                                    ? item.status : 'not_arrived';
                                const isReschedulingThis = rescheduleScheduleId === item.id;

                                return (
                                    <div key={item.id} className="glass-panel group hover:border-primary/40 transition-colors overflow-hidden">
                                        {/* メイン行: 名前 + ボタン4つを横1行 */}
                                        <div className="flex items-stretch">
                                            {/* ステータスバー（左端） */}
                                            <div className={`w-1.5 flex-shrink-0 ${statusColor}`} />
                                            {/* 名前＋ステータス（固定幅） */}
                                            <div className="flex flex-col justify-center px-3 py-3" style={{ width: '8.5rem', flexShrink: 0 }}>
                                                <div className="text-sm font-black leading-tight truncate" title={item.patient.name}>{item.patient.name}</div>
                                                <div className="text-[10px] opacity-70 mt-0.5 truncate flex items-center gap-1" title={item.patient.memo}>
                                                    <span className="font-black">{statusLabel}</span>
                                                    {item.patient.memo && (
                                                        <>
                                                            <span className="opacity-40">|</span>
                                                            <span className="truncate">{item.patient.memo}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {/* ボタン4つ: 残り幅を均等分割 */}
                                            <div className="flex flex-1 gap-1.5 p-1.5">
                                                {(item.patient.type === 'task' ? [
                                                    { id: 'not_arrived', label: '未実施', color: 'bg-red-500/80', active: 'bg-red-500' },
                                                    { id: 'arrived', label: '済', color: 'bg-green-500/80', active: 'bg-green-500' },
                                                    { id: 'rescheduled', label: '別日', color: 'bg-purple-500/80', active: 'bg-purple-500' }
                                                ] : [
                                                    { id: 'not_arrived', label: '未到着', color: 'bg-red-500/80', active: 'bg-red-500' },
                                                    { id: 'arrived', label: '到着', color: 'bg-green-500/80', active: 'bg-green-500' },
                                                    { id: 'calling', label: '電話確認中', color: 'bg-blue-500/80', active: 'bg-blue-500' },
                                                    { id: 'rescheduled', label: '別日', color: 'bg-purple-500/80', active: 'bg-purple-500' },
                                                ]).map(btn => {
                                                    const isActive = effectiveStatus === btn.id;
                                                    return (
                                                        <button key={btn.id}
                                                            onClick={() => {
                                                                if (btn.id === 'rescheduled') {
                                                                    if (isReschedulingThis) {
                                                                        setRescheduleScheduleId(null); setRescheduleDate('');
                                                                    } else {
                                                                        setRescheduleScheduleId(item.id); setRescheduleDate(selectedDate);
                                                                    }
                                                                } else {
                                                                    updateScheduleStatus(item.id, btn.id);
                                                                    if (isReschedulingThis) { setRescheduleScheduleId(null); setRescheduleDate(''); }
                                                                }
                                                            }}
                                                            className={`flex-1 py-3 rounded-xl text-white font-black transition-all active:brightness-75 flex items-center justify-center text-center leading-tight
                                                                ${isActive ? btn.active + ' shadow-md opacity-100' : btn.color + ' opacity-40 hover:opacity-80'}`}
                                                            style={{ fontSize: '0.68rem' }}>
                                                            {btn.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* 別日日付入力UI（展開） */}
                                        {isReschedulingThis && (
                                            <div className="flex items-center gap-3 p-3 bg-purple-500/10 border-t border-purple-500/30 animate-in slide-in-from-top-2 duration-200">
                                                <span className="text-xs font-black text-purple-400 whitespace-nowrap">📅 別日の訪問日:</span>
                                                <input
                                                    type="date"
                                                    value={rescheduleDate}
                                                    onChange={e => setRescheduleDate(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-purple-500/30 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50"
                                                />
                                                <button onClick={() => handleRescheduleConfirm(item.id)}
                                                    className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-black hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                                                >確定</button>
                                                <button onClick={() => { setRescheduleScheduleId(null); setRescheduleDate(''); }}
                                                    className="px-3 py-2 rounded-xl bg-secondary text-xs font-black opacity-60 hover:opacity-100 transition-all whitespace-nowrap"
                                                >✕</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            };

                            return (
                                <div className="space-y-8">
                                    {patientsList.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="font-black text-lg flex items-center gap-2 opacity-80"><span>👥</span> 患者予定</h4>
                                            <div className="grid gap-4">
                                                {patientsList.map(renderRow)}
                                            </div>
                                        </div>
                                    )}

                                    {tasksList.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="font-black text-lg text-blue-600 flex items-center gap-2"><span>📝</span> タスク予定</h4>
                                            <div className="grid gap-4">
                                                {tasksList.map(renderRow)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {viewMode === 'patients' && (() => {
                    // ひらがな・カタカナを相互変換して正規化する関数（シンプルな検索用）
                    const normalizeKana = (str) => {
                        return str.replace(/[\u30a1-\u30f6]/g, function (match) {
                            const chr = match.charCodeAt(0) - 0x60;
                            return String.fromCharCode(chr);
                        }).toLowerCase();
                    };

                    const searchNormal = normalizeKana(searchTerm);

                    const filteredAndSortedPatients = appData.patients
                        .filter(p => !p.deleted)
                        .filter(p => {
                            if (!searchTerm) return true;
                            // 名前と備考から検索
                            const target = normalizeKana((p.name || '') + (p.memo || ''));
                            return target.includes(searchNormal);
                        })
                        .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

                    const patientsOnly = filteredAndSortedPatients.filter(p => p.type !== 'task');
                    const tasksOnly = filteredAndSortedPatients.filter(p => p.type === 'task');

                    // 共通のカード描画関数
                    const renderCard = (p) => {
                        const isPaused = p.status === 'paused';
                        const isEnded = p.status === 'ended';
                        const isInactive = isPaused || isEnded;
                        const isTask = p.type === 'task';

                        return (
                            <div key={p.id} className={`px-5 py-4 glass-panel group border transition-all flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative ${isInactive ? 'border-primary/5 opacity-60 saturate-50' : 'border-primary/5 hover:border-primary/20'}`}>
                                {/* ステータス左端線 */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl opacity-80 ${isPaused ? 'bg-gray-400' : isEnded ? 'bg-red-400' : (isTask ? 'bg-blue-500' : p.type === 'single' ? 'bg-amber-500' : 'bg-emerald-500')}`} />

                                {/* 名前 */}
                                <div className="w-full sm:w-1/3 flex items-center gap-2 pl-2 sm:pl-0">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase whitespace-nowrap ${isPaused ? 'bg-gray-200 text-gray-700' : isEnded ? 'bg-red-100 text-red-700' : (isTask ? 'bg-blue-100 text-blue-700' : p.type === 'single' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}`}>
                                        {isPaused ? '一時停止' : isEnded ? '終了' : (isTask ? 'タスク' : p.type === 'single' ? '単発' : '定期')}
                                    </span>
                                    <div className={`text-lg sm:text-base font-black truncate ${isInactive ? 'text-primary/70 line-through' : 'text-primary'}`}>
                                        {p.name}
                                    </div>
                                </div>

                                {/* 訪問日時情報 */}
                                <div className="w-full sm:w-1/4 flex items-center gap-2 text-sm font-bold opacity-80 pl-2 sm:pl-0">
                                    {p.type === 'single' ? (
                                        <span className="flex items-center gap-1.5 text-amber-700">
                                            📅 {p.targetDate} <span className="opacity-60 text-xs ml-1">(💊{p.prescriptionDays}日)</span>
                                        </span>
                                    ) : (
                                        <span className={`flex items-center gap-1.5 ${isTask ? 'text-blue-700' : 'text-emerald-700'}`}>
                                            🔁 {['日', '月', '火', '水', '木', '金', '土'][p.dayOfWeek]}曜
                                            <span className="opacity-60 text-xs ml-1">
                                                ({p.weekNumbers?.length > 0 ? `第${p.weekNumbers.join(',')}週` : (p.weekNumber === 'every' ? '毎週' : `第${p.weekNumber}週`)})
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {/* 備考 */}
                                <div className="flex-1 text-xs opacity-60 font-medium truncate pl-2 sm:pl-0">
                                    {p.memo || <span className="italic opacity-40">備考なし</span>}
                                </div>

                                {/* 編集ボタン */}
                                <div className="absolute right-4 top-4 sm:relative sm:right-auto sm:top-auto w-10 flex justify-end">
                                    <button onClick={() => { setEditingPatient(p); setIsEditModalOpen(true); }}
                                        className="p-2 hover:bg-primary/10 rounded-xl transition-colors opacity-40 hover:opacity-100 group-hover:opacity-100">
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        );
                    };

                    return (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="text-2xl font-black text-primary flex-shrink-0">患者管理マスター</h3>

                                {/* 検索窓 */}
                                <div className="relative w-full md:max-w-xs">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        🔍
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="名前や備考で検索..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            // 検索時は自動で全件展開状態にする
                                            if (e.target.value) {
                                                setIsPatientsExpanded(true);
                                                setIsTasksExpanded(true);
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-3 bg-secondary/10 border border-primary/20 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-bold text-sm"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setIsPatientsExpanded(false);
                                                setIsTasksExpanded(false);
                                            }}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs opacity-40 hover:opacity-100 transition-opacity"
                                        >✕</button>
                                    )}
                                </div>

                                <div className="flex gap-2 w-full md:w-auto flex-shrink-0 flex-wrap">
                                    <button
                                        onClick={() => {
                                            setEditingPatient({ type: 'periodic' });
                                            setIsEditModalOpen(true);
                                        }}
                                        className="flex-1 md:flex-none 
                                        bg-primary 
                                        px-3 py-3 
                                        rounded-2xl 
                                        font-bold 
                                        shadow-lg shadow-primary/20 
                                        border border-primary/20
                                        hover:scale-[1.02] 
                                        active:scale-95 
                                        transition-all 
                                        text-xs sm:text-sm"
                                        style={{ color: '#111' }}
                                    >
                                        ➕ 定期登録
                                    </button>
                                    <button onClick={() => { setEditingPatient({ type: 'single' }); setIsEditModalOpen(true); }}
                                        className="flex-1 md:flex-none bg-secondary text-primary px-3 py-3 rounded-2xl font-bold border border-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs sm:text-sm">
                                        ➕ 単発登録
                                    </button>
                                    <button onClick={() => { setEditingPatient({ type: 'task' }); setIsEditModalOpen(true); }}
                                        className="flex-1 md:flex-none bg-blue-500 text-white px-3 py-3 rounded-2xl font-bold hover:bg-blue-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20 transition-all text-xs sm:text-sm">
                                        ➕ タスク登録
                                    </button>
                                </div>
                            </div>

                            {/* テーブルヘッダー風 */}
                            <div className="hidden sm:flex px-6 py-2 text-[10px] font-black opacity-40 uppercase tracking-widest gap-4">
                                <div className="w-1/3">患者名</div>
                                <div className="w-1/4">訪問予定</div>
                                <div className="flex-1">備考</div>
                                <div className="w-10"></div>
                            </div>

                            {/* 横並びリスト (患者) */}
                            <div className="flex flex-col gap-2">
                                {(isPatientsExpanded || searchTerm ? patientsOnly : patientsOnly.slice(0, 5)).map(p => renderCard(p))}
                                {patientsOnly.length === 0 && (
                                    <div className="p-12 text-center opacity-40 italic border border-dashed border-primary/20 rounded-3xl">
                                        {searchTerm ? '検索条件に一致する患者が見つかりません' : '登録されている患者がいません'}
                                    </div>
                                )}
                                {!searchTerm && patientsOnly.length > 5 && (
                                    <button
                                        onClick={() => setIsPatientsExpanded(!isPatientsExpanded)}
                                        className="mt-2 py-3 px-6 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-primary/10 text-sm font-bold text-primary transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <span>{isPatientsExpanded ? '一部のみ表示' : `すべて表示 (残 ${patientsOnly.length - 5} 人)`}</span>
                                        <span className={`transition-transform duration-300 ${isPatientsExpanded ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                )}
                            </div>

                            {/* タスク一覧セクション */}
                            <div className="mt-12 pt-8 border-t border-primary/10">
                                <h3 className="text-xl font-black text-blue-600 mb-6 flex items-center gap-2">
                                    <span>📝</span> 登録済みタスク
                                </h3>

                                {/* テーブルヘッダー風 (タスク用) */}
                                <div className="hidden sm:flex px-6 py-2 text-[10px] font-black opacity-40 uppercase tracking-widest gap-4">
                                    <div className="w-1/3">タスク名</div>
                                    <div className="w-1/4">実施予定</div>
                                    <div className="flex-1">備考</div>
                                    <div className="w-10"></div>
                                </div>

                                {/* 横並びリスト (タスク) */}
                                <div className="flex flex-col gap-2">
                                    {(isTasksExpanded || searchTerm ? tasksOnly : tasksOnly.slice(0, 5)).map(p => renderCard(p))}
                                    {tasksOnly.length === 0 && (
                                        <div className="p-12 text-center opacity-40 italic border border-dashed border-primary/20 rounded-3xl">
                                            {searchTerm ? '検索条件に一致するタスクが見つかりません' : '登録されているタスクはありません'}
                                        </div>
                                    )}
                                    {!searchTerm && tasksOnly.length > 5 && (
                                        <button
                                            onClick={() => setIsTasksExpanded(!isTasksExpanded)}
                                            className="mt-2 py-3 px-6 rounded-2xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-sm font-bold text-blue-600 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <span>{isTasksExpanded ? '一部のみ表示' : `すべて表示 (残 ${tasksOnly.length - 5} 件)`}</span>
                                            <span className={`transition-transform duration-300 ${isTasksExpanded ? 'rotate-180' : ''}`}>▼</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {viewMode === 'logs' && (
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black mb-6">監査ログ</h3>
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-4 scrollbar-thin">
                            {appData.logs.slice().reverse().map(log => (
                                <div key={log.id} className="p-4 bg-secondary/10 rounded-2xl border border-primary/5 text-sm flex gap-4">
                                    <div className="font-mono text-[10px] opacity-40 shrink-0 w-32">{new Date(log.createdAt).toLocaleString()}</div>
                                    <div className="font-black text-primary min-w-[80px]">[{log.actionType}]</div>
                                    <div className="opacity-80">{log.memo}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'settings' && (
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black">環境設定</h3>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="p-8 bg-secondary/10 rounded-[2rem] border border-primary/10">
                                <h4 className="font-black mb-4 flex items-center gap-2">📱 端末ステータス</h4>
                                <div className="space-y-2 text-sm">
                                    <p className="flex justify-between"><span className="opacity-60">デバイスID:</span> <span className="font-mono text-[10px]">{deviceId}</span></p>
                                    <p className="flex justify-between"><span className="opacity-60">権限ランク:</span>
                                        <span className={`font-black ${appData.masterDeviceId === deviceId ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {appData.masterDeviceId === deviceId ? 'マスター管理者' : 'サブ端末'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="p-8 bg-secondary/10 rounded-[2rem] border border-primary/10 flex flex-col gap-4">
                                <h4 className="font-black text-center flex items-center justify-center gap-2"><span>📂</span> エクセルを使った一括登録</h4>
                                <div className="text-xs opacity-80 mb-2 leading-relaxed space-y-2">
                                    <p>エクセルファイルを使って、患者さんやタスクを一覧で確認したり、一気に新しく登録したりできます。</p>
                                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li><span className="font-bold">「テンプレートをダウンロード」</span>を押して空のエクセルを取得するか、<span className="font-bold">「現在のデータを出力」</span>で登録済みデータを出力します</li>
                                            <li>ダウンロードしたエクセルを開き、患者さんの名前や曜日を入力して保存<br />
                                                <span className="text-[10px] text-destructive ml-4">※「ID」の列はそのままにして、新しい人はIDを空欄にしてください</span>
                                            </li>
                                            <li><span className="font-bold">「データ取込」</span>を押して、保存したエクセルを選ぶ</li>
                                        </ol>
                                        <p className="text-[10px] mt-2 opacity-60 ml-4">※ 曜日は「月」、週は「1,3」や「2週間毎」などと入力できます。</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 w-full mt-auto pt-2">
                                    <a href="/visit_management_data_2026-07-04.xlsx" download className="w-full py-3 bg-green-600 text-white border border-green-700/50 rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                                        <span>📄</span> テンプレートをダウンロード
                                    </a>
                                    <div className="flex gap-2 w-full">
                                        <button onClick={handleExport} className="flex-1 py-3 bg-primary border border-primary/20 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                                            <span>📤</span> 現在のデータを出力
                                        </button>
                                        <div className="flex-1 relative">
                                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-secondary text-primary rounded-2xl font-bold border border-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                                                <span>📥</span> データ取込
                                            </button>
                                            <input
                                                type="file"
                                                accept=".xlsx"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleImport}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* モーダル群 */}
            {isEditModalOpen && (() => {
                const isTask = editingPatient?.type === 'task';
                const isPeriodic = (editingPatient?.type || 'periodic') === 'periodic';
                const isSingle = editingPatient?.type === 'single';
                const isPeriodicOrTask = isPeriodic || isTask;
                const accentColor = isTask ? '#3b82f6' : isPeriodic ? '#10b981' : '#f59e0b';

                const theme = isTask
                    ? { base: 'blue', text: 'text-blue-500', bg: 'bg-blue-500', bgLight: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'focus:ring-blue-500/50', gradient: 'from-blue-600 to-indigo-500' }
                    : isPeriodic
                        ? { base: 'emerald', text: 'text-emerald-500', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'focus:ring-emerald-500/50', gradient: 'from-emerald-600 to-teal-500' }
                        : { base: 'amber', text: 'text-amber-500', bg: 'bg-amber-500', bgLight: 'bg-amber-500/10', border: 'border-amber-500/20', ring: 'focus:ring-amber-500/50', gradient: 'from-amber-600 to-orange-500' };

                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
                        <div style={{ width: '100%', maxWidth: '36rem', background: 'hsl(var(--background))', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: `4px solid ${accentColor}` }}>
                            {/* モーダルヘッダー */}
                            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${isTask ? 'rgba(59,130,246,0.2)' : isPeriodic ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                {!isTask ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.25rem', background: 'rgba(0,0,0,0.05)', borderRadius: '0.75rem' }}>
                                        <button type="button" onClick={() => setEditingPatient({ ...editingPatient, type: 'periodic' })}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 900, transition: 'all 0.2s', border: 'none', cursor: 'pointer', background: isPeriodic ? '#10b981' : 'transparent', color: isPeriodic ? 'white' : 'inherit', opacity: isPeriodic ? 1 : 0.4 }}>
                                            定期訪問
                                        </button>
                                        <button type="button" onClick={() => setEditingPatient({ ...editingPatient, type: 'single' })}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 900, transition: 'all 0.2s', border: 'none', cursor: 'pointer', background: isSingle ? '#f59e0b' : 'transparent', color: isSingle ? 'white' : 'inherit', opacity: isSingle ? 1 : 0.4 }}>
                                            単発訪問
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 900, color: accentColor }}>
                                        📝 タスク管理
                                    </div>
                                )}
                                <button onClick={() => setIsEditModalOpen(false)} style={{ fontSize: '1.5rem', opacity: 0.4, border: 'none', background: 'none', cursor: 'pointer', color: accentColor }}>✕</button>
                            </div>

                            <div style={{ padding: '1.5rem', overflowY: 'auto', flexGrow: 1, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.25rem', color: accentColor }}>
                                    {editingPatient?.id ? (isTask ? 'タスク情報の変更' : '患者情報の変更') : (isTask ? 'タスク・新規登録' : isPeriodic ? '定期患者様・新規登録' : '単発患者様・新規登録')}
                                </h3>

                                <form onSubmit={handleSavePatient} className="space-y-6">
                                    <input type="hidden" name="type" value={editingPatient?.type || 'periodic'} />

                                    <div className="space-y-5">
                                        <div className="grid gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">ステータス</label>
                                            <div className="flex gap-2">
                                                {[{ id: 'active', label: '稼働中', bg: 'bg-emerald-500/10 text-emerald-600', border: 'border-emerald-500/30' },
                                                { id: 'paused', label: '一時停止', bg: 'bg-gray-500/10 text-gray-600', border: 'border-gray-500/30' },
                                                { id: 'ended', label: '終了', bg: 'bg-red-500/10 text-red-600', border: 'border-red-500/30' }].map(s => (
                                                    <label key={s.id} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${((editingPatient?.status || 'active') === s.id) ? s.border + ' ' + s.bg + ' font-black shadow-inner' : 'border-transparent bg-secondary/10 opacity-60 hover:opacity-100 font-bold'}`}>
                                                        <input type="radio" name="status" value={s.id} checked={(editingPatient?.status || 'active') === s.id} onChange={(e) => setEditingPatient({ ...editingPatient, status: e.target.value })} className="hidden" />
                                                        {s.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="grid gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{isTask ? 'タスク名' : '患者氏名'}</label>
                                                <input name="name"
                                                    value={modalInputName}
                                                    onChange={(e) => setModalInputName(e.target.value)}
                                                    required placeholder={isTask ? "タスク名を入力 (例: 監査業務)" : "氏名を入力"}
                                                    className={`w-full p-4 rounded-2xl bg-secondary/30 border ${theme.border} ${theme.ring} outline-none font-bold text-lg transition-all`} />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">備考 (任意)</label>
                                                <input name="memo" defaultValue={editingPatient?.memo} placeholder="備考を入力"
                                                    className={`w-full p-4 rounded-2xl bg-secondary/10 border ${theme.border} ${theme.ring} outline-none font-medium text-sm transition-all`} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 mt-6">
                                            <div className="grid gap-2">
                                                <label className={`text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2 ${theme.text}`}>
                                                    <span>📅</span> {isTask ? '計算基準日（ここから周期を計算）' : isPeriodic ? '計算基準日（ここから周期を計算）' : '今回処方日（基準日）'}
                                                </label>
                                                <input type="date" name={isPeriodicOrTask ? 'startBaseDate' : 'singleBaseDate'}
                                                    defaultValue={(isPeriodicOrTask ? editingPatient?.startBaseDate : editingPatient?.singleBaseDate) || new Date().toISOString().split('T')[0]}
                                                    className={`w-full p-4 rounded-2xl bg-secondary/30 border ${theme.border} outline-none font-mono text-lg`} />
                                            </div>
                                        </div>

                                        {isPeriodicOrTask ? (
                                            /* 定期患者・タスクフォーム: 曜日と週指定を整理 */
                                            <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${isTask ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}`, background: isTask ? 'rgba(59,130,246,0.05)' : 'rgba(16,185,129,0.05)', position: 'relative', overflow: 'hidden' }}>
                                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl ${isTask ? 'bg-blue-500/5' : 'bg-emerald-500/5'}`} />

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {/* 発生曜日 */}
                                                    {/* hidden input for form submission */}
                                                    <input type="hidden" name="dayOfWeek" value={selectedDayOfWeek} />
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: accentColor, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            🗓️ {isTask ? 'タスク発生曜日' : '医師訪問曜日'}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'nowrap' }}>
                                                            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                                                                <button type="button" key={i}
                                                                    onClick={() => setSelectedDayOfWeek(i)}
                                                                    style={{
                                                                        flex: 1, padding: '0.4rem 0', textAlign: 'center',
                                                                        borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 900,
                                                                        cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                                                        background: selectedDayOfWeek === i ? accentColor : 'rgba(0,0,0,0.05)',
                                                                        color: selectedDayOfWeek === i ? 'white' : '#334155',
                                                                        boxShadow: selectedDayOfWeek === i ? `0 2px 8px ${accentColor}60` : 'none',
                                                                        transform: selectedDayOfWeek === i ? 'scale(1.08)' : 'scale(1)',
                                                                    }}>
                                                                    {d}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* 訪問週 */}
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: accentColor, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            🔢 {isTask ? 'タスク発生の頻度' : '訪問の頻度'}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.25rem', background: 'rgba(0,0,0,0.05)', borderRadius: '0.75rem' }}>
                                                            <button type="button" onClick={() => setScheduleMode('monthly_week')}
                                                                style={{ flex: 1, padding: '0.4rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 900, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: scheduleMode === 'monthly_week' ? accentColor : 'transparent', color: scheduleMode === 'monthly_week' ? 'white' : 'inherit', opacity: scheduleMode === 'monthly_week' ? 1 : 0.4 }}>
                                                                月ごとの週指定
                                                            </button>
                                                            <button type="button" onClick={() => setScheduleMode('interval')}
                                                                style={{ flex: 1, padding: '0.4rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 900, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: scheduleMode === 'interval' ? accentColor : 'transparent', color: scheduleMode === 'interval' ? 'white' : 'inherit', opacity: scheduleMode === 'interval' ? 1 : 0.4 }}>
                                                                〇週間ごと指定
                                                            </button>
                                                        </div>

                                                        {scheduleMode === 'monthly_week' ? (
                                                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                                {[
                                                                    { val: 1, label: '第1週' }, { val: 2, label: '第2週' },
                                                                    { val: 3, label: '第3週' }, { val: 4, label: '第4週' }
                                                                ].map(w => {
                                                                    const isChecked = selectedWeeks.includes(w.val);
                                                                    return (
                                                                        <React.Fragment key={w.val}>
                                                                            {isChecked && <input type="hidden" name="weekNumbers" value={w.val} />}
                                                                            <button type="button"
                                                                                onClick={() => setSelectedWeeks(prev =>
                                                                                    prev.includes(w.val) ? prev.filter(v => v !== w.val) : [...prev, w.val]
                                                                                )}
                                                                                style={{
                                                                                    flex: 1, padding: '0.4rem 0', textAlign: 'center',
                                                                                    borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 900,
                                                                                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                                                                    background: isChecked ? accentColor : 'rgba(0,0,0,0.05)',
                                                                                    color: isChecked ? 'white' : '#334155',
                                                                                    boxShadow: isChecked ? `0 2px 8px ${accentColor}60` : 'none',
                                                                                    transform: isChecked ? 'scale(1.05)' : 'scale(1)',
                                                                                }}>
                                                                                {w.label}
                                                                            </button>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-4">
                                                                <input type="number" value={intervalWeeks} onChange={(e) => setIntervalWeeks(parseInt(e.target.value) || 1)} min="1" max="30"
                                                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', background: 'hsl(var(--background))', border: `1px solid ${accentColor}`, outline: 'none', fontSize: '1.25rem', fontWeight: 900, textAlign: 'center', color: accentColor }} />
                                                                <span className="text-sm font-black opacity-60">週間ごとに{isTask ? '発生' : '訪問'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 単発患者フォーム */
                                            <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '0.75rem', border: `1px solid rgba(245,158,11,0.2)`, background: 'rgba(245,158,11,0.05)', position: 'relative', overflow: 'hidden' }}>
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                                                <div className="grid gap-4">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme.text}`}>
                                                        <span>💊</span> 処方日数
                                                    </label>
                                                    <div className="flex items-center gap-4">
                                                        <input type="number" name="prescriptionDays" defaultValue={editingPatient?.prescriptionDays || 28} min="1"
                                                            style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', background: 'hsl(var(--background))', border: `1px solid ${isPeriodic ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, outline: 'none', fontSize: '2rem', fontWeight: 900, textAlign: 'center', color: '#f59e0b' }} />
                                                        <span className={`text-xl font-black opacity-40`}>日間</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme.text}`}>
                                                        <span>🎯</span> 訪問日の自動調整
                                                    </label>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'near_day', label: '近接曜日合わせ', desc: '同じ曜日に自動調整' },
                                                            { id: 'exact', label: 'きっかり当日', desc: '処方日数日後の当日を訪問日に設定' }

                                                        ].map(mode => (
                                                            <label key={mode.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'hsl(var(--background))', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                                <input type="radio" name="calcMode" value={mode.id} defaultChecked={(editingPatient?.calcMode || 'exact') === mode.id} className={`mt-1 w-6 h-6 accent-amber-500`} />
                                                                <div>
                                                                    <div className="font-black text-sm">{mode.label}</div>
                                                                    <div className="text-[10px] opacity-40 font-bold">{mode.desc}</div>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* フッターアクション */}
                                    <div style={{ padding: '1rem 0 0', borderTop: `1px solid ${isTask ? 'rgba(59,130,246,0.2)' : isPeriodic ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, marginTop: '1.25rem' }}>
                                        {(() => {
                                            const hasDuplicate = modalInputName.trim() !== '' && appData.patients.some(p => !p.deleted && p.name === modalInputName.trim() && p.id !== editingPatient?.id && p.type === editingPatient?.type);
                                            return hasDuplicate ? (
                                                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-red-500 text-xs font-black animate-in slide-in-from-bottom-2">
                                                    <span>⚠️</span>
                                                    すでに同じ名前の{isTask ? 'タスク' : '患者様'}が登録されています。注意してください。
                                                </div>
                                            ) : null;
                                        })()}

                                        <button type="submit" style={{ width: '100%', padding: '1rem', background: isTask ? 'linear-gradient(to right, #2563eb, #4f46e5)' : isPeriodic ? 'linear-gradient(to right, #059669, #0d9488)' : 'linear-gradient(to right, #d97706, #ea580c)', color: 'white', fontWeight: 900, borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '1rem', marginBottom: '0.75rem', transition: 'all 0.2s' }}>
                                            {editingPatient?.id ? '変更内容を適用する' : '登録を確定する'}
                                        </button>

                                        <div className="flex gap-2">
                                            {editingPatient?.id && (
                                                <button type="button" onClick={() => handleDeletePatient(editingPatient.id)}
                                                    style={{ flex: 1, padding: '0.75rem', color: '#ef4444', fontWeight: 900, background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                    🗑️ 登録を削除
                                                </button>
                                            )}
                                            <button type="button" onClick={() => setIsEditModalOpen(false)}
                                                style={{ flex: 1, padding: '0.75rem', fontWeight: 900, background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6 }}>
                                                閉じる
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none !important; }
                .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
            `}</style>
        </div >
    );
}
