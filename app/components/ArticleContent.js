'use client';

import { useEffect, useRef } from 'react';

export default function ArticleContent({ html }) {
    const contentRef = useRef(null);

    useEffect(() => {
        const images = contentRef.current.querySelectorAll("img");

        const handleClick = (e) => {
            const img = e.target;
            const modal = document.createElement("div");
            modal.className = "image-modal";
            modal.innerHTML = `<img src="${img.src}" alt="${img.alt || ''}">`;
            modal.onclick = () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 200);
            };
            document.body.appendChild(modal);

            // Simple animation
            requestAnimationFrame(() => {
                modal.style.display = "flex";
            });
        };

        images.forEach(img => {
            img.style.cursor = 'zoom-in';
            img.addEventListener("click", handleClick);
        });

        // --- Table Sorting Logic ---
        const tables = contentRef.current.querySelectorAll("table");
        tables.forEach(table => {
            const headers = table.querySelectorAll("th");
            let sortDirections = Array(headers.length).fill(0); // 0: none, 1: asc, -1: desc

            headers.forEach((th, colIndex) => {
                const originalText = th.textContent;
                if (originalText.includes('↕')) {
                    th.style.cursor = 'pointer';
                    th.style.userSelect = 'none';
                    th.setAttribute('title', 'クリックで並び替え');

                    th.addEventListener("click", () => {
                        const tbody = table.querySelector("tbody");
                        if (!tbody) return;

                        const rows = Array.from(tbody.querySelectorAll("tr"));
                        
                        // Toggle direction (default to descending first for stars/high values)
                        let newDirection = sortDirections[colIndex] === -1 ? 1 : -1;
                        
                        // Reset all headers
                        headers.forEach((h, i) => {
                            if (h.textContent.match(/[↕↑↓]/)) {
                                h.textContent = h.textContent.replace(/[↕↑↓]/, i === colIndex ? (newDirection === 1 ? '↑' : '↓') : '↕');
                                sortDirections[i] = i === colIndex ? newDirection : 0;
                            }
                        });

                        rows.sort((a, b) => {
                            const cellA = a.children[colIndex];
                            const cellB = b.children[colIndex];
                            if (!cellA || !cellB) return 0;

                            const valA = cellA.textContent.trim();
                            const valB = cellB.textContent.trim();

                            // 1. Star Count comparison (★)
                            const starsA = (valA.match(/★/g) || []).length;
                            const starsB = (valB.match(/★/g) || []).length;
                            if (starsA > 0 || starsB > 0) {
                                return newDirection * (starsA - starsB);
                            }

                            // 2. Number comparison (e.g., 14h, 2.4h)
                            const numA = parseFloat(valA.replace(/[^0-9.]/g, ''));
                            const numB = parseFloat(valB.replace(/[^0-9.]/g, ''));
                            if (!isNaN(numA) && !isNaN(numB)) {
                                return newDirection * (numA - numB);
                            }

                            // 3. String comparison fallback
                            return newDirection * valA.localeCompare(valB, 'ja');
                        });

                        rows.forEach(row => tbody.appendChild(row));
                    });
                }
            });
        });

        return () => {
            images.forEach(img => {
                img.removeEventListener("click", handleClick);
            });
        };
    }, [html]);

    return (
        <div
            ref={contentRef}
            className="article-content"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
