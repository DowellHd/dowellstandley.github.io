/**
 * FinRAG Live Demo — Interactive Query Modal
 *
 * Opens when the user clicks "Live Demo" on the FinRAG project card.
 * Hits the deployed FinRAG API to answer questions about Apple's FY2023 10-K.
 *
 * Update FINRAG_API_URL after Render deployment.
 */

(function () {
    'use strict';

    // ── Config ───────────────────────────────────────────────────────────────
    const FINRAG_API_URL = 'https://finrag-api.onrender.com'; // update after deploy
    const PRESET_QUESTIONS = [
        "What was Apple's total revenue in FY2023?",
        "What were Apple's main risk factors?",
        "How much cash did Apple have on hand?",
        "What was Apple's earnings per share?",
    ];

    // ── State ────────────────────────────────────────────────────────────────
    let isLoading = false;

    // ── Modal open/close ─────────────────────────────────────────────────────
    function openModal() {
        const modal = document.getElementById('finrag-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.classList.add('finrag-modal-open');
        // Focus the input for accessibility
        const input = document.getElementById('finrag-input');
        if (input) setTimeout(() => input.focus(), 100);
        checkApiHealth();
    }

    function closeModal() {
        const modal = document.getElementById('finrag-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.classList.remove('finrag-modal-open');
    }

    // ── API health check ─────────────────────────────────────────────────────
    async function checkApiHealth() {
        const badge = document.getElementById('finrag-status-badge');
        if (!badge) return;

        badge.textContent = '● Checking…';
        badge.style.color = '#aaa';

        try {
            const res = await fetch(`${FINRAG_API_URL}/health`, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) throw new Error('non-ok');
            const data = await res.json();
            badge.textContent = data.doc_count > 0 ? '● Online' : '● Seeding…';
            badge.style.color = '#64ffda';
        } catch {
            badge.textContent = '● Offline';
            badge.style.color = '#ff006e';
        }
    }

    // ── Query ────────────────────────────────────────────────────────────────
    async function submitQuery(question) {
        if (isLoading || !question.trim()) return;
        isLoading = true;

        const answerBox   = document.getElementById('finrag-answer-box');
        const sourcesLine = document.getElementById('finrag-sources');
        const askBtn      = document.getElementById('finrag-ask-btn');

        answerBox.textContent   = '';
        sourcesLine.textContent = '';
        askBtn.disabled = true;
        setLoadingState(true);

        try {
            const res = await fetch(`${FINRAG_API_URL}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question.trim(), top_k: 5 }),
                signal: AbortSignal.timeout(30000),
            });

            if (res.status === 429) {
                answerBox.textContent = 'Rate limit reached. Please wait a moment and try again.';
                return;
            }
            if (!res.ok) {
                answerBox.textContent = 'The API returned an error. Please try again.';
                return;
            }

            const data = await res.json();
            answerBox.textContent = data.answer || '(no answer returned)';

            // Build sources line
            if (data.sources && data.sources.length > 0) {
                const srcParts = data.sources.map(s => {
                    const ticker  = s.ticker   ? `[${s.ticker}]`   : '';
                    const docType = s.doc_type ? `${s.doc_type}`   : '';
                    const page    = s.page_num != null ? `p.${s.page_num}` : '';
                    return [s.source_file, ticker, docType, page].filter(Boolean).join(' ');
                });
                const latency = data.latency_ms ? `  ·  ${Math.round(data.latency_ms)}ms` : '';
                sourcesLine.textContent = 'Sources: ' + srcParts.join('  ·  ') + latency;
            }
        } catch (err) {
            answerBox.textContent =
                err.name === 'TimeoutError'
                    ? 'Request timed out. The free-tier server may be waking up — try again in a moment.'
                    : 'Could not reach the FinRAG API. It may be starting up on Render's free tier.';
        } finally {
            isLoading = false;
            askBtn.disabled = false;
            setLoadingState(false);
        }
    }

    function setLoadingState(loading) {
        const spinner  = document.getElementById('finrag-spinner');
        const answerSection = document.getElementById('finrag-answer-section');
        if (spinner)       spinner.style.display       = loading ? 'block' : 'none';
        if (answerSection) answerSection.style.display = loading ? 'none'  : 'block';
    }

    // ── Build modal DOM ──────────────────────────────────────────────────────
    function buildModal() {
        if (document.getElementById('finrag-modal')) return; // already built

        const style = document.createElement('style');
        style.textContent = `
            #finrag-modal {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.75);
                z-index: 9000;
                align-items: center;
                justify-content: center;
                padding: 16px;
                font-family: 'Roboto Mono', monospace;
            }
            body.finrag-modal-open { overflow: hidden; }
            #finrag-panel {
                background: #0a192f;
                border: 1px solid #64ffda;
                border-radius: 12px;
                width: 100%;
                max-width: 640px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 8px 40px rgba(0,0,0,0.6);
                color: #ccd6f6;
            }
            #finrag-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 20px 14px;
                border-bottom: 1px solid rgba(100,255,218,0.2);
            }
            #finrag-header h3 {
                font-size: 1rem;
                color: #64ffda;
                margin: 0;
                letter-spacing: 0.5px;
            }
            #finrag-header-right {
                display: flex;
                align-items: center;
                gap: 14px;
            }
            #finrag-status-badge {
                font-size: 0.78rem;
                color: #64ffda;
            }
            #finrag-close-btn {
                background: none;
                border: none;
                color: #ccd6f6;
                font-size: 1.3rem;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                line-height: 1;
                transition: color 0.2s;
            }
            #finrag-close-btn:hover { color: #ff006e; }
            #finrag-body {
                padding: 20px;
            }
            #finrag-subtitle {
                font-size: 0.82rem;
                color: #8892b0;
                margin-bottom: 16px;
            }
            #finrag-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 18px;
            }
            .finrag-chip {
                background: rgba(100,255,218,0.07);
                border: 1px solid rgba(100,255,218,0.3);
                color: #64ffda;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.76rem;
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s;
                font-family: inherit;
            }
            .finrag-chip:hover {
                background: rgba(100,255,218,0.15);
                border-color: #64ffda;
            }
            #finrag-input-row {
                display: flex;
                gap: 10px;
                margin-bottom: 18px;
            }
            #finrag-input {
                flex: 1;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(100,255,218,0.3);
                border-radius: 6px;
                color: #ccd6f6;
                padding: 10px 14px;
                font-family: inherit;
                font-size: 0.88rem;
                outline: none;
                transition: border-color 0.2s;
            }
            #finrag-input:focus { border-color: #64ffda; }
            #finrag-input::placeholder { color: #4a5568; }
            #finrag-ask-btn {
                background: #64ffda;
                color: #0a192f;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-weight: bold;
                font-family: inherit;
                font-size: 0.88rem;
                cursor: pointer;
                transition: background 0.2s, opacity 0.2s;
                white-space: nowrap;
            }
            #finrag-ask-btn:hover:not(:disabled) { background: #4fd8b8; }
            #finrag-ask-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            #finrag-spinner {
                display: none;
                text-align: center;
                padding: 24px 0;
                font-size: 0.82rem;
                color: #64ffda;
                letter-spacing: 2px;
            }
            #finrag-answer-section { display: block; }
            #finrag-answer-label {
                font-size: 0.78rem;
                color: #8892b0;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }
            #finrag-answer-box {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(100,255,218,0.15);
                border-radius: 6px;
                padding: 14px 16px;
                font-size: 0.88rem;
                line-height: 1.7;
                color: #ccd6f6;
                min-height: 80px;
                white-space: pre-wrap;
            }
            #finrag-sources {
                margin-top: 10px;
                font-size: 0.75rem;
                color: #64ffda;
                opacity: 0.8;
            }
            #finrag-disclaimer {
                margin-top: 18px;
                padding-top: 14px;
                border-top: 1px solid rgba(100,255,218,0.1);
                font-size: 0.72rem;
                color: #4a5568;
                line-height: 1.5;
            }
            @media (max-width: 500px) {
                #finrag-input-row { flex-direction: column; }
                #finrag-chips .finrag-chip { font-size: 0.72rem; }
            }
        `;
        document.head.appendChild(style);

        const modal = document.createElement('div');
        modal.id = 'finrag-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'finrag-modal-title');

        modal.innerHTML = `
            <div id="finrag-panel">
                <div id="finrag-header">
                    <h3 id="finrag-modal-title">FinRAG — Live Demo</h3>
                    <div id="finrag-header-right">
                        <span id="finrag-status-badge">● Checking…</span>
                        <button id="finrag-close-btn" aria-label="Close demo modal">&times;</button>
                    </div>
                </div>
                <div id="finrag-body">
                    <p id="finrag-subtitle">Query Apple's FY2023 10-K filing via a live RAG pipeline.</p>
                    <div id="finrag-chips">
                        ${PRESET_QUESTIONS.map(q =>
                            `<button class="finrag-chip" type="button">${q}</button>`
                        ).join('')}
                    </div>
                    <div id="finrag-input-row">
                        <input
                            id="finrag-input"
                            type="text"
                            placeholder="Ask a financial question…"
                            maxlength="500"
                            autocomplete="off"
                        />
                        <button id="finrag-ask-btn" type="button">Ask</button>
                    </div>
                    <div id="finrag-spinner">Querying pipeline…</div>
                    <div id="finrag-answer-section">
                        <p id="finrag-answer-label">Answer</p>
                        <div id="finrag-answer-box">Ask a question above to see a grounded answer from the document.</div>
                        <p id="finrag-sources"></p>
                    </div>
                    <p id="finrag-disclaimer">
                        Powered by FinRAG — BGE embeddings · ChromaDB · MMR reranking · GPT-4o-mini.
                        Answers are grounded in the indexed document and may not reflect all available data.
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // ── Event listeners ──────────────────────────────────────────────────
        document.getElementById('finrag-close-btn').addEventListener('click', closeModal);

        // Close on backdrop click (not on panel click)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
        });

        // Preset question chips
        modal.querySelectorAll('.finrag-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const input = document.getElementById('finrag-input');
                if (input) input.value = chip.textContent;
                submitQuery(chip.textContent);
            });
        });

        // Ask button
        document.getElementById('finrag-ask-btn').addEventListener('click', () => {
            const val = document.getElementById('finrag-input').value;
            submitQuery(val);
        });

        // Enter key in input
        document.getElementById('finrag-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitQuery(e.target.value);
            }
        });
    }

    // ── Wire up "Live Demo" button ────────────────────────────────────────────
    function init() {
        buildModal();

        // Find the FinRAG "Live Demo" anchor by its href="#" inside .other-project-card
        const demoBtns = document.querySelectorAll('.other-project-card .project-link.primary');
        demoBtns.forEach((btn) => {
            if (btn.textContent.trim().includes('Live Demo')) {
                btn.href = 'javascript:void(0)';
                btn.setAttribute('aria-haspopup', 'dialog');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal();
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
