/**
 * FinRAG "Add to Home Screen" popup — mobile only.
 *
 * Android/Chrome supports a native install prompt (beforeinstallprompt).
 * iOS Safari does not support it at all, so we detect iOS and show manual
 * "tap Share, then Add to Home Screen" instructions instead.
 */

(function () {
    'use strict';

    const DISMISS_KEY = 'finrag-install-dismissed';

    function isStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true
        );
    }

    function wasDismissed() {
        return localStorage.getItem(DISMISS_KEY) === '1';
    }

    function markDismissed() {
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch (e) {
            // localStorage unavailable (private mode, etc.) — safe to ignore
        }
    }

    function getPlatform() {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const isAndroid = /Android/.test(ua);
        return { isIOS, isAndroid };
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw-finrag.js', { scope: '/finrag.html' })
                .catch(() => {
                    // Install prompt still works without it on some browsers;
                    // fail silently rather than surfacing this to the user.
                });
        }
    }

    function showPopup({ title, message, actionLabel, onAction }) {
        const popup = document.getElementById('finrag-install-popup');
        const titleEl = document.getElementById('finrag-install-title');
        const messageEl = document.getElementById('finrag-install-instructions');
        const actionBtn = document.getElementById('finrag-install-action');
        const closeBtn = document.getElementById('finrag-install-close');
        if (!popup || !titleEl || !messageEl || !actionBtn || !closeBtn) return;

        titleEl.textContent = title;
        messageEl.innerHTML = message;
        actionBtn.textContent = actionLabel;

        popup.hidden = false;

        const dismiss = () => {
            popup.hidden = true;
            markDismissed();
        };

        closeBtn.onclick = dismiss;
        actionBtn.onclick = () => {
            onAction();
            dismiss();
        };
    }

    function init() {
        if (isStandalone() || wasDismissed()) return;

        const { isIOS, isAndroid } = getPlatform();
        if (!isIOS && !isAndroid) return; // desktop: nothing to show

        registerServiceWorker();

        if (isIOS) {
            // No programmatic install API on iOS — show manual steps.
            setTimeout(() => {
                showPopup({
                    title: 'Install FinRAG',
                    message:
                        'Tap <i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i> Share, then scroll down and tap "Add to Home Screen".',
                    actionLabel: 'Got it',
                    onAction: () => {},
                });
            }, 2500);
            return;
        }

        // Android: wait for the browser's native install signal.
        let deferredPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showPopup({
                title: 'Install FinRAG',
                message: 'Add this demo to your home screen for one-tap access.',
                actionLabel: 'Install',
                onAction: async () => {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice;
                    deferredPrompt = null;
                },
            });
        });

        window.addEventListener('appinstalled', () => {
            markDismissed();
            const popup = document.getElementById('finrag-install-popup');
            if (popup) popup.hidden = true;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
