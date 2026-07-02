'use strict';

const GOOGLE_SCRIPT_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const FINAL_CTA_URL = '#';
const LOADING_DURATION = 3000;

const QUESTION_TRANSITION_DELAY = 420;

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

function initSurvey() {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        console.warn('Survey root element was not found.');
        return;
    }

    renderQuestion();
}

function renderQuestion() {
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
            <div class="step-area" aria-label="Anket ilerlemesi">
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
                <h2 class="question-title">${escapeHtml(currentQuestion.question)}</h2>
            </div>

            <div class="answers-list">
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
}

function handleAnswerClick(questionId, answer) {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        return;
    }

    const buttons = quizRoot.querySelectorAll('.answer-button');

    buttons.forEach((button) => {
        button.disabled = true;

        if (button.getAttribute('data-answer-id') === answer.id) {
            button.classList.add('is-selected');
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
            renderQuestion();
        }, QUESTION_TRANSITION_DELAY);

        return;
    }

    submitSurveyData();
    showLoadingScreen();

    window.setTimeout(() => {
        showFinalScreen();
    }, LOADING_DURATION);
}

function showLoadingScreen() {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        return;
    }

    quizRoot.innerHTML = `
        <div class="quiz-view loading-view" data-view="loading">
            <div class="loading-orb" aria-hidden="true"></div>

            <h2 class="loading-title">Sizin için en iyi teklifi hazırlıyoruz...</h2>

            <div class="loading-progress" aria-hidden="true">
                <div class="loading-progress__fill"></div>
            </div>
        </div>
    `;
}

function showFinalScreen() {
    const quizRoot = document.getElementById('quiz-root');

    if (!quizRoot) {
        return;
    }

    const safeFinalUrl = typeof FINAL_CTA_URL === 'string' && FINAL_CTA_URL.trim()
        ? FINAL_CTA_URL.trim()
        : '#';

    quizRoot.innerHTML = `
        <div class="quiz-view final-view" data-view="final">
            <div class="final-badge" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" focusable="false">
                    <path d="M20 6.75L9.5 17.25L4 11.75" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </div>

            <h2 class="final-title">Teşekkürler!</h2>

            <p class="final-text">
                Cevaplarına göre sana özel bir teklif hazırlandı. Devam ederek kişisel avantajını görüntüleyebilirsin.
            </p>

            <a class="final-cta" href="${escapeHtml(safeFinalUrl)}" data-final-cta>
                <span>Kişisel Teklifimi Görüntüle</span>
            </a>
        </div>
    `;

    const finalCta = quizRoot.querySelector('[data-final-cta]');

    if (!finalCta) {
        return;
    }

    finalCta.addEventListener('click', (event) => {
        if (safeFinalUrl === '#') {
            event.preventDefault();
        }
    });
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
    const isPlaceholderUrl = GOOGLE_SCRIPT_URL === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
    const isEmptyUrl = typeof GOOGLE_SCRIPT_URL !== 'string' || GOOGLE_SCRIPT_URL.trim() === '';

    if (isPlaceholderUrl || isEmptyUrl) {
        console.warn('Google Apps Script URL is not configured. Survey payload was not sent.');
        return;
    }

    const payload = buildPayload();

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.warn('Survey payload could not be sent.', error);
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

document.addEventListener('DOMContentLoaded', initSurvey);