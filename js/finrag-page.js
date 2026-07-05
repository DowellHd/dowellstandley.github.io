/**
 * FinRAG standalone demo page — inline query interface.
 * Hits the deployed FinRAG API to answer questions about the indexed
 * financial documents, or an ephemeral document the visitor uploads.
 */

(function () {
    'use strict';

    const FINRAG_API_URL = 'https://finrag-lbf3.onrender.com';
    const PRESET_QUESTIONS = [
        "What was the total revenue reported?",
        "What are the main risk factors disclosed?",
        "How much cash and cash equivalents were on hand?",
        "What was the reported earnings per share?",
    ];

    let isLoading = false;

    function renderChips() {
        const wrap = document.getElementById('finrag-chips');
        if (!wrap) return;
        wrap.innerHTML = PRESET_QUESTIONS.map(
            (q) => `<button class="finrag-chip" type="button">${q}</button>`
        ).join('');
        wrap.querySelectorAll('.finrag-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                const input = document.getElementById('finrag-input');
                if (input) input.value = chip.textContent;
                submitQuery(chip.textContent);
            });
        });
    }

    const HEALTH_RETRY_LIMIT = 6; // ~30s of polling while the free-tier host wakes up

    async function checkApiHealth(attempt = 0) {
        const badge = document.getElementById('finrag-status-badge');
        if (!badge) return;

        if (attempt === 0) {
            badge.textContent = '● Checking…';
            badge.style.color = '#aaa';
        }

        try {
            const res = await fetch(`${FINRAG_API_URL}/health`, { signal: AbortSignal.timeout(8000) });

            // Render free tier returns 503 immediately while the instance is
            // still booting — that's a "waking up" state, not actually down.
            if (res.status === 503) throw new Error('waking');

            if (!res.ok) throw new Error('non-ok');
            const data = await res.json();
            badge.textContent = data.doc_count > 0 ? '● Online' : '● Seeding…';
            badge.style.color = '#64ffda';
        } catch (err) {
            // Render's edge can return a cold-start 503 with no CORS headers
            // at all, which surfaces here as a generic rejected fetch —
            // indistinguishable from actually being down. Treat every
            // failure as "waking up" until retries are exhausted, so a cold
            // boot doesn't get mislabeled as offline.
            if (attempt < HEALTH_RETRY_LIMIT) {
                badge.textContent = '● Waking up…';
                badge.style.color = '#ffb700';
                setTimeout(() => checkApiHealth(attempt + 1), 5000);
                return;
            }
            badge.textContent = '● Offline';
            badge.style.color = '#ff006e';
        }
    }

    function setLoadingState(loading) {
        const spinner = document.getElementById('finrag-spinner');
        const answerSection = document.getElementById('finrag-answer-section');
        if (spinner) spinner.style.display = loading ? 'flex' : 'none';
        if (answerSection) answerSection.style.display = loading ? 'none' : 'block';
        document.querySelectorAll('.finrag-chip').forEach((chip) => {
            chip.disabled = loading;
        });
    }

    async function submitQuery(question) {
        if (isLoading || !question.trim()) return;
        isLoading = true;

        const answerBox = document.getElementById('finrag-answer-box');
        const sourcesLine = document.getElementById('finrag-sources');
        const askBtn = document.getElementById('finrag-ask-btn');

        answerBox.textContent = '';
        answerBox.classList.remove('finrag-error');
        sourcesLine.innerHTML = '';
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
                answerBox.classList.add('finrag-error');
                return;
            }
            if (res.status === 503) {
                answerBox.textContent = 'The server is waking up from being idle (free-tier hosting). Please try again in about 20 seconds.';
                answerBox.classList.add('finrag-error');
                checkApiHealth();
                return;
            }
            if (!res.ok) {
                answerBox.textContent = 'The API returned an error. Please try again.';
                answerBox.classList.add('finrag-error');
                return;
            }

            const data = await res.json();
            answerBox.textContent = data.answer || '(no answer returned)';

            if (data.sources && data.sources.length > 0) {
                const pills = data.sources.map((s) => {
                    const ticker = s.ticker ? `[${s.ticker}]` : '';
                    const docType = s.doc_type ? `${s.doc_type}` : '';
                    const page = s.page_num != null ? `p.${s.page_num}` : '';
                    const label = [s.source_file, ticker, docType, page].filter(Boolean).join(' ');
                    return `<span class="finrag-source-pill">${label}</span>`;
                });
                const latency = data.latency_ms
                    ? `<span class="finrag-latency">${Math.round(data.latency_ms)}ms</span>`
                    : '';
                sourcesLine.innerHTML = pills.join('') + latency;
            }
        } catch (err) {
            answerBox.textContent =
                err.name === 'TimeoutError'
                    ? 'Request timed out. The free-tier server may be waking up — try again in a moment.'
                    : 'Could not reach the FinRAG API. It may be starting up on Render free tier — try again shortly.';
            answerBox.classList.add('finrag-error');
            checkApiHealth();
        } finally {
            isLoading = false;
            askBtn.disabled = false;
            setLoadingState(false);
        }
    }

    function init() {
        renderChips();
        checkApiHealth();

        const askBtn = document.getElementById('finrag-ask-btn');
        const input = document.getElementById('finrag-input');

        if (askBtn && input) {
            askBtn.addEventListener('click', () => submitQuery(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submitQuery(input.value);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
