'use client';

import React, { useState, useEffect } from 'react';
import VisitManagement from './VisitManagement';

/**
 * VisitManagementWrapper
 * ログイン状態に応じて、親コンポーネントや Markdown コンテンツの表示を制御します。
 */
export default function VisitManagementWrapper() {
    const [isUnlocked, setIsUnlocked] = useState(false);

    useEffect(() => {
        // ログイン状態に応じて、特定の要素を非表示にするスタイルを適用または削除
        if (isUnlocked) {
            const styleId = 'visit-management-logged-in-style';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    /* 1. 目次を非表示 */
                    .article-page-toc {
                        display: none !important;
                    }
                    /* 2. 記事メタヘッダー（カテゴリ、タグ、日付、タイトル、要約など）を非表示 */
                    .article-info-header {
                        display: none !important;
                    }
                    /* 3. Markdownコンテンツ（導入文や主な機能、セキュリティ等すべて）を非表示 */
                    .article-content {
                        display: none !important;
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            const style = document.getElementById('visit-management-logged-in-style');
            if (style) {
                style.remove();
            }
        }
    }, [isUnlocked]);

    return (
        <VisitManagement onLoginStateChange={setIsUnlocked} />
    );
}
