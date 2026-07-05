/**
 * FinRAG "Upload Your Own" flow — ephemeral document Q&A.
 *
 * Uploads a document to the FinRAG API's /upload endpoint, then queries it
 * via /ephemeral-query using the returned session_id. Nothing here is
 * persisted client-side (no localStorage/sessionStorage) — a page refresh
 * loses the session too, matching the "ephemeral" messaging in the UI.
 */

(function () {
    'use strict';

    const FINRAG_API_URL = 'https://finrag-lbf3.onrender.com';
    const MAX_CLIENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — matches backend cap; server remains authoritative
    const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md'];

    let currentSessionId = null;
    let isUploading = false;
    let isAsking = false;

    // ── Mode toggle ──────────────────────────────────────────────────────────

    function initModeToggle() {
        const sampleBtn = document.getElementById('finrag-mode-sample');
        const uploadBtn = document.getElementById('finrag-mode-upload');
        const samplePanel = document.getElementById('finrag-sample-panel');
        const uploadPanel = document.getElementById('finrag-upload-panel');
        if (!sampleBtn || !uploadBtn || !samplePanel || !uploadPanel) return;

        function showSample() {
            sampleBtn.classList.add('active');
            uploadBtn.classList.remove('active');
            sampleBtn.setAttribute('aria-selected', 'true');
            uploadBtn.setAttribute('aria-selected', 'false');
            samplePanel.hidden = false;
            uploadPanel.hidden = true;
        }

        function showUpload() {
            uploadBtn.classList.add('active');
            sampleBtn.classList.remove('active');
            uploadBtn.setAttribute('aria-selected', 'true');
            sampleBtn.setAttribute('aria-selected', 'false');
            uploadPanel.hidden = false;
            samplePanel.hidden = true;
        }

        sampleBtn.addEventListener('click', showSample);
        uploadBtn.addEventListener('click', showUpload);
    }

    // ── Status helpers ───────────────────────────────────────────────────────

    function setUploadStatus(message, kind) {
        const el = document.getElementById('finrag-upload-status');
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('finrag-error', 'finrag-success');
        if (kind) el.classList.add(kind);
    }

    function setUploadLoading(loading) {
        const spinner = document.getElementById('finrag-upload-spinner');
        const uploadBtn = document.getElementById('finrag-upload-btn');
        if (spinner) spinner.style.display = loading ? 'flex' : 'none';
        if (uploadBtn) uploadBtn.disabled = loading;
    }

    function setAskLoading(loading) {
        const spinner = document.getElementById('finrag-upload-spinner');
        const answerSection = document.getElementById('finrag-upload-answer-section');
        const askBtn = document.getElementById('finrag-upload-ask-btn');
        if (spinner) spinner.style.display = loading ? 'flex' : 'none';
        if (answerSection) answerSection.hidden = loading || answerSection.hidden;
        if (askBtn) askBtn.disabled = loading;
    }

    function resetUploadState(message) {
        currentSessionId = null;
        const filenameEl = document.getElementById('finrag-upload-filename');
        const inputRow = document.getElementById('finrag-upload-input-row');
        const answerSection = document.getElementById('finrag-upload-answer-section');
        const questionInput = document.getElementById('finrag-upload-question');
        if (filenameEl) filenameEl.textContent = '';
        if (inputRow) inputRow.hidden = true;
        if (answerSection) answerSection.hidden = true;
        if (questionInput) questionInput.value = '';
        if (message) setUploadStatus(message, 'finrag-error');
    }

    // ── Upload ───────────────────────────────────────────────────────────────

    function initUploadFlow() {
        const uploadBtn = document.getElementById('finrag-upload-btn');
        const fileInput = document.getElementById('finrag-file-input');
        if (!uploadBtn || !fileInput) return;

        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files && fileInput.files[0];
            if (file) uploadDocument(file);
        });
    }

    async function uploadDocument(file) {
        if (isUploading) return;

        const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            setUploadStatus(
                `Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
                'finrag-error'
            );
            return;
        }
        if (file.size > MAX_CLIENT_SIZE_BYTES) {
            setUploadStatus('File exceeds the 5MB limit. Please choose a smaller document.', 'finrag-error');
            return;
        }

        isUploading = true;
        setUploadLoading(true);
        setUploadStatus('Uploading and processing your document…');
        resetUploadState();

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${FINRAG_API_URL}/upload`, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(30000),
            });

            if (res.status === 413) {
                setUploadStatus('File exceeds the maximum allowed size.', 'finrag-error');
                return;
            }
            if (res.status === 429) {
                setUploadStatus('Rate limit reached. Please wait a moment and try again.', 'finrag-error');
                return;
            }
            if (res.status === 503) {
                setUploadStatus('The server is waking up from being idle — try again in about 20 seconds.', 'finrag-error');
                return;
            }
            if (!res.ok) {
                setUploadStatus('Could not process the uploaded document. Please try a different file.', 'finrag-error');
                return;
            }

            const data = await res.json();
            currentSessionId = data.session_id;

            const filenameEl = document.getElementById('finrag-upload-filename');
            if (filenameEl) {
                filenameEl.textContent = `"${data.filename}" — ${data.chunks_indexed} chunk(s) indexed.` +
                    (data.truncated ? ' (document was large and truncated)' : '') +
                    ` Expires in ~${Math.round(data.expires_in_seconds / 60)} min.`;
            }

            const inputRow = document.getElementById('finrag-upload-input-row');
            if (inputRow) inputRow.hidden = false;

            setUploadStatus('Ready — ask a question below.', 'finrag-success');
        } catch (err) {
            setUploadStatus(
                err.name === 'TimeoutError'
                    ? 'Upload timed out. The free-tier server may be waking up — try again in a moment.'
                    : 'Could not reach the FinRAG API. It may be starting up on Render free tier.',
                'finrag-error'
            );
        } finally {
            isUploading = false;
            setUploadLoading(false);
        }
    }

    // ── Ephemeral query ──────────────────────────────────────────────────────

    async function submitUploadQuery(question) {
        if (isAsking || !question.trim()) return;
        if (!currentSessionId) {
            setUploadStatus('Please upload a document first.', 'finrag-error');
            return;
        }

        isAsking = true;
        const answerBox = document.getElementById('finrag-upload-answer-box');
        const sourcesLine = document.getElementById('finrag-upload-sources');
        const answerSection = document.getElementById('finrag-upload-answer-section');
        const askBtn = document.getElementById('finrag-upload-ask-btn');

        if (answerBox) {
            answerBox.textContent = '';
            answerBox.classList.remove('finrag-error');
        }
        if (sourcesLine) sourcesLine.innerHTML = '';
        if (answerSection) answerSection.hidden = true;
        setAskLoading(true);

        try {
            const res = await fetch(`${FINRAG_API_URL}/ephemeral-query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentSessionId, question: question.trim() }),
                signal: AbortSignal.timeout(30000),
            });

            if (res.status === 404) {
                resetUploadState('Your upload session has expired. Please upload your document again.');
                return;
            }
            if (res.status === 429) {
                if (answerBox) {
                    answerBox.textContent = 'Rate limit reached. Please wait a moment and try again.';
                    answerBox.classList.add('finrag-error');
                }
                if (answerSection) answerSection.hidden = false;
                return;
            }
            if (!res.ok) {
                if (answerBox) {
                    answerBox.textContent = 'The API returned an error. Please try again.';
                    answerBox.classList.add('finrag-error');
                }
                if (answerSection) answerSection.hidden = false;
                return;
            }

            const data = await res.json();
            if (answerBox) {
                answerBox.textContent = data.truncated_notice
                    ? `${data.answer}\n\n(${data.truncated_notice})`
                    : data.answer || '(no answer returned)';
            }

            if (sourcesLine && data.sources && data.sources.length > 0) {
                const pills = data.sources.map((s) => {
                    const page = s.page_num != null ? `p.${s.page_num}` : '';
                    const label = [s.source_file, page].filter(Boolean).join(' ');
                    return `<span class="finrag-source-pill">${label}</span>`;
                });
                const latency = data.latency_ms
                    ? `<span class="finrag-latency">${Math.round(data.latency_ms)}ms</span>`
                    : '';
                sourcesLine.innerHTML = pills.join('') + latency;
            }

            if (answerSection) answerSection.hidden = false;
        } catch (err) {
            if (answerBox) {
                answerBox.textContent =
                    err.name === 'TimeoutError'
                        ? 'Request timed out. The free-tier server may be waking up — try again in a moment.'
                        : 'Could not reach the FinRAG API. It may be starting up on Render free tier — try again shortly.';
                answerBox.classList.add('finrag-error');
            }
            if (answerSection) answerSection.hidden = false;
        } finally {
            isAsking = false;
            setAskLoading(false);
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    function init() {
        initModeToggle();
        initUploadFlow();

        const askBtn = document.getElementById('finrag-upload-ask-btn');
        const input = document.getElementById('finrag-upload-question');
        if (askBtn && input) {
            askBtn.addEventListener('click', () => submitUploadQuery(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submitUploadQuery(input.value);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
