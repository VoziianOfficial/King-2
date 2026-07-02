'use strict';

const GOOGLE_SCRIPT_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const FINAL_CTA_URL = '#';
const LOADING_DURATION = 3000;
const QUESTION_TRANSITION_DELAY = 180;
const REDUCED_MOTION_LOADING_DURATION = 250;
const LOADING_STATUS_INTERVAL = 800;
const LOADING_STATUS_MESSAGES = [
    'Yanıtlarınız analiz ediliyor...',
    'Tercihleriniz eşleştiriliyor...',
    'Kişisel ekran hazırlanıyor...'
];

const questions = [
    {
        id: 'question1',
        step: 1,
        question: 'Platformumuza ara vermenin temel nedeni neydi?',
        answers: [
            { id: 'a', text: 'Uzun süren finansal işlemler.' },
            { id: 'b', text: 'Karmaşık hesap doğrulama süreçleri.' },
            { id: 'c', text: 'Başka platformları kullanıyorum.' }
        ]
    },
    {
        id: 'question2',
        step: 2,
        question: 'Sadakat programımızda eksikliğini en çok hissettiğin şey neydi?',
        answers: [
            { id: 'a', text: 'Aktifliğe bağlı ekstra ödüller ve ayrıcalıklar.' },
            { id: 'b', text: 'Daha esnek ve rahat hesap yönetimi.' },
            { id: 'c', text: 'Müşteri hizmetlerinden özel ilgi ve destek.' }
        ]
    },
    {
        id: 'question3',
        step: 3,
        question: 'Şu an geri dönmeni sağlayacak en çekici yenilik ne olurdu?',
        answers: [
            { id: 'a', text: 'Anında gerçekleşen işlemler.' },
            { id: 'b', text: 'Büyük bir kişisel teklif veya iade avantajı.' },
            { id: 'c', text: 'Daha geniş içerik ve oyun kütüphanesi.' }
        ]
    }
];

let currentStep = 0;
const answers = {};
let isTransitioning = false;
let loadingStatusTimer = null;

const prefersReducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initSurvey() {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        return;
    }

    renderQuestion(false);
    initPremiumInteractions();
}

function renderQuestion(shouldMoveFocus) {
    const quizRoot = document.getElementById('quiz-root');
    const currentQuestion = questions[currentStep];

    if (!quizRoot || !currentQuestion) {
        return;
    }

    const progressPercent = ((currentQuestion.step / questions.length) * 100).toFixed(3);
    const dotsMarkup = questions
        .map((question) => {
            const dotClass = [
                'step-dot',
                question.step === currentQuestion.step ? 'is-active' : '',
                question.step < currentQuestion.step ? 'is-complete' : ''
            ]
                .filter(Boolean)
                .join(' ');

            return `<span class="${dotClass}" aria-hidden="true"></span>`;
        })
        .join('');

    const answersMarkup = currentQuestion.answers
        .map((answer, index) => {
            const answerLetter = String.fromCharCode(65 + index);

            return `
                <button
                    class="answer-button"
                    type="button"
                    data-question-id="${escapeHtml(currentQuestion.id)}"
                    data-answer-id="${escapeHtml(answer.id)}"
                    aria-label="${escapeHtml(answer.text)}"
                >
                    <span class="answer-button__mark" aria-hidden="true">${answerLetter}</span>
                    <span class="answer-button__text">${escapeHtml(answer.text)}</span>
                </button>
            `;
        })
        .join('');

    quizRoot.innerHTML = `
        <div class="quiz-view" data-view="question">
            <div
                class="step-area"
                role="progressbar"
                aria-label="Anket ilerlemesi"
                aria-valuemin="1"
                aria-valuemax="${questions.length}"
                aria-valuenow="${currentQuestion.step}"
                aria-valuetext="Adım ${currentQuestion.step} / ${questions.length}"
            >
                <div class="step-meta">
                    <span class="step-label">Adım ${currentQuestion.step} / ${questions.length}</span>
                    <span class="step-dots" aria-hidden="true">${dotsMarkup}</span>
                </div>

                <div class="progress-track" aria-hidden="true">
                    <div class="progress-fill" style="--progress: ${progressPercent}%;"></div>
                </div>
            </div>

            <div class="question-block">
                <p class="question-kicker">Müşteri deneyimi</p>
                <h2 id="current-question-title" class="question-title" tabindex="-1">${escapeHtml(currentQuestion.question)}</h2>
            </div>

            <div class="answers-list" role="group" aria-labelledby="current-question-title">
                ${answersMarkup}
            </div>
        </div>
    `;

    const answerButtons = quizRoot.querySelectorAll('.answer-button');

    answerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const questionId = button.getAttribute('data-question-id');
            const answerId = button.getAttribute('data-answer-id');
            const selectedAnswer = currentQuestion.answers.find((answer) => answer.id === answerId);

            if (!questionId || !selectedAnswer) {
                return;
            }

            handleAnswerClick(questionId, selectedAnswer);
        });
    });

    if (shouldMoveFocus) {
        focusViewHeading(quizRoot);
    }
}

function handleAnswerClick(questionId, answer) {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot || isTransitioning) {
        return;
    }

    isTransitioning = true;

    const buttons = quizRoot.querySelectorAll('.answer-button');

    buttons.forEach((button) => {
        button.disabled = true;

        if (button.getAttribute('data-answer-id') === answer.id) {
            button.classList.add('is-selected', 'is-pulsing');
            button.setAttribute('aria-pressed', 'true');
        } else {
            button.setAttribute('aria-pressed', 'false');
        }
    });

    answers[questionId] = answer.text;

    const isLastQuestion = currentStep >= questions.length - 1;

    if (!isLastQuestion) {
        window.setTimeout(() => {
            currentStep += 1;
            isTransitioning = false;
            renderQuestion(true);
        }, prefersReducedMotion ? 0 : QUESTION_TRANSITION_DELAY);

        return;
    }

    void submitSurveyData();
    showLoadingScreen();

    window.setTimeout(() => {
        showFinalScreen();
    }, prefersReducedMotion ? REDUCED_MOTION_LOADING_DURATION : LOADING_DURATION);
}

function showLoadingScreen() {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        return;
    }

    quizRoot.setAttribute('aria-busy', 'true');
    quizRoot.innerHTML = `
        <div class="quiz-view loading-view" data-view="loading">
            <div class="loading-orb" aria-hidden="true"></div>

            <h2 class="loading-title" tabindex="-1">Sizin için en iyi teklifi hazırlıyoruz...</h2>

            <p class="loading-status" aria-live="polite" aria-atomic="true">
                ${LOADING_STATUS_MESSAGES[0]}
            </p>

            <div class="loading-progress" aria-hidden="true">
                <div class="loading-progress__fill"></div>
            </div>
        </div>
    `;

    window.requestAnimationFrame(() => {
        quizRoot.setAttribute('aria-busy', 'false');
    });
    startLoadingStatusUpdates(quizRoot);
    focusViewHeading(quizRoot);
}

function showFinalScreen() {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        return;
    }

    clearLoadingStatusTimer();

    const safeFinalUrl = getSafeHttpUrl(FINAL_CTA_URL);
    const ctaMarkup = safeFinalUrl
        ? `<a class="final-cta" href="${escapeHtml(safeFinalUrl)}" data-final-cta>
                <span>Kişisel Teklifimi Görüntüle</span>
            </a>`
        : `<button class="final-cta is-disabled" type="button" disabled aria-disabled="true">
                <span>Kişisel Teklifimi Görüntüle</span>
            </button>`;

    quizRoot.setAttribute('aria-busy', 'false');
    quizRoot.innerHTML = `
        <div class="quiz-view final-view" data-view="final">
            <div class="final-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" focusable="false">
                    <path d="M20 6.75L9.5 17.25L4 11.75" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </div>

            <div class="final-light-sweep" aria-hidden="true"></div>

            <h2 class="final-title" tabindex="-1">Teşekkürler!</h2>

            <p class="final-text">
                Cevaplarına göre sana özel bir teklif hazırlandı. Devam ederek kişisel avantajını görüntüleyebilirsin.
            </p>

            ${ctaMarkup}
        </div>
    `;

    focusViewHeading(quizRoot);
}

function startLoadingStatusUpdates(root) {
    clearLoadingStatusTimer();

    if (prefersReducedMotion) {
        return;
    }

    let messageIndex = 0;

    loadingStatusTimer = window.setInterval(() => {
        const status = root.querySelector('.loading-status');

        if (!status) {
            clearLoadingStatusTimer();
            return;
        }

        messageIndex += 1;

        if (messageIndex >= LOADING_STATUS_MESSAGES.length) {
            clearLoadingStatusTimer();
            return;
        }

        status.textContent = LOADING_STATUS_MESSAGES[messageIndex];

        if (messageIndex === LOADING_STATUS_MESSAGES.length - 1) {
            clearLoadingStatusTimer();
        }
    }, LOADING_STATUS_INTERVAL);
}

function clearLoadingStatusTimer() {
    if (loadingStatusTimer === null) {
        return;
    }

    window.clearInterval(loadingStatusTimer);
    loadingStatusTimer = null;
}

function initPremiumInteractions() {
    const desktopPointerQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
        : null;
    const hasTouchInput = navigator.maxTouchPoints > 0;

    if (prefersReducedMotion || hasTouchInput || !desktopPointerQuery || !desktopPointerQuery.matches) {
        return;
    }

    document.documentElement.classList.add('has-premium-pointer');
    initMouseReactiveBackground(desktopPointerQuery);
    initCardTilt(desktopPointerQuery);
}

function initMouseReactiveBackground(desktopPointerQuery) {
    const root = document.documentElement;
    let frameId = null;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    const updateScene = () => {
        frameId = null;

        if (!desktopPointerQuery.matches) {
            return;
        }

        const normalizedX = (pointerX / window.innerWidth) - 0.5;
        const normalizedY = (pointerY / window.innerHeight) - 0.5;

        root.style.setProperty('--scene-glow-x', `${(normalizedX * 20).toFixed(2)}px`);
        root.style.setProperty('--scene-glow-y', `${(normalizedY * 14).toFixed(2)}px`);
        root.style.setProperty('--scene-watermark-x', `${(normalizedX * -12).toFixed(2)}px`);
        root.style.setProperty('--scene-watermark-y', `${(normalizedY * -8).toFixed(2)}px`);
    };

    const requestSceneUpdate = (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;

        if (frameId === null) {
            frameId = window.requestAnimationFrame(updateScene);
        }
    };

    const resetScene = () => {
        root.style.setProperty('--scene-glow-x', '0px');
        root.style.setProperty('--scene-glow-y', '0px');
        root.style.setProperty('--scene-watermark-x', '0px');
        root.style.setProperty('--scene-watermark-y', '0px');
    };

    window.addEventListener('mousemove', requestSceneUpdate, { passive: true });
    document.documentElement.addEventListener('mouseleave', resetScene);
}

function initCardTilt(desktopPointerQuery) {
    const card = document.querySelector('.survey-card');

    if (!card) {
        return;
    }

    card.classList.add('has-pointer-tilt');

    const enableTilt = () => {
        card.classList.add('is-tilt-ready');
    };

    const handleRevealEnd = (event) => {
        if (event.target !== card || event.animationName !== 'cardReveal') {
            return;
        }

        card.removeEventListener('animationend', handleRevealEnd);
        enableTilt();
    };

    const updateTilt = (event) => {
        if (!desktopPointerQuery.matches) {
            return;
        }

        const bounds = card.getBoundingClientRect();
        const normalizedX = ((event.clientX - bounds.left) / bounds.width) - 0.5;
        const normalizedY = ((event.clientY - bounds.top) / bounds.height) - 0.5;
        const rotateX = Math.max(-3, Math.min(3, normalizedY * -6));
        const rotateY = Math.max(-4, Math.min(4, normalizedX * 8));

        card.classList.add('is-tilt-active');
        card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
    };

    const resetTilt = () => {
        card.classList.remove('is-tilt-active');
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
    };

    card.addEventListener('animationend', handleRevealEnd);
    card.addEventListener('mousemove', updateTilt, { passive: true });
    card.addEventListener('mouseleave', resetTilt);
    window.setTimeout(enableTilt, 1000);
}

function collectUrlParams() {
    const params = new URLSearchParams(window.location.search);

    return {
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        utm_term: params.get('utm_term') || '',
        gclid: params.get('gclid') || '',
        fbclid: params.get('fbclid') || '',
        click_id: params.get('click_id') || '',
        campaign_id: params.get('campaign_id') || '',
        adset_id: params.get('adset_id') || '',
        ad_id: params.get('ad_id') || '',
        source: params.get('source') || ''
    };
}

function buildPayload() {
    return {
        brand: '1KING',
        submittedAt: new Date().toISOString(),
        answers: {
            question1: answers.question1 || '',
            question2: answers.question2 || '',
            question3: answers.question3 || ''
        },
        urlParams: collectUrlParams(),
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language
    };
}

async function submitSurveyData() {
    const scriptUrl = getSafeHttpUrl(GOOGLE_SCRIPT_URL);

    if (!scriptUrl) {
        return false;
    }

    const body = JSON.stringify(buildPayload());

    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-store',
            keepalive: true,
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8'
            },
            body
        });

        return true;
    } catch (error) {
        return false;
    }
}

function getSafeHttpUrl(value) {
    if (
        typeof value !== 'string'
        || !value.trim()
        || value.trim() === '#'
        || value === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'
    ) {
        return '';
    }

    try {
        const url = new URL(value.trim(), window.location.href);

        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (error) {
        return '';
    }
}

function focusViewHeading(root) {
    const heading = root.querySelector('h2[tabindex="-1"]');

    if (!heading) {
        return;
    }

    window.requestAnimationFrame(() => {
        try {
            heading.focus({ preventScroll: true });
        } catch (error) {
            heading.focus();
        }
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSurvey, { once: true });
} else {
    initSurvey();
}
