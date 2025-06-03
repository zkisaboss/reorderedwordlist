// ==UserScript==
// @name         Skribbl AutoGuesser
// @name:zh-CN   Skribbl 自动猜词器
// @name:zh-TW   Skribbl 自動猜詞器
// @name:hi      Skribbl स्वतः अनुमान स्क्रिप्ट
// @name:es      Skribbl Adivinador Automático
// @namespace    http://tampermonkey.net/
// @version      1.07
// @description  Automatically suggests guesses in Skribbl.io. Fast, easy, and effective.
// @description:zh-CN 自动在 Skribbl.io 中猜词，快速、简单、有效。
// @description:zh-TW 自動在 Skribbl.io 中猜詞，快速、簡單、有效。
// @description:hi Skribbl.io में शब्दों का अनुमान लगाने वाली तेज़ और आसान स्क्रिप्ट।
// @description:es Adivina palabras automáticamente en Skribbl.io de forma rápida y sencilla.
// @author       Zach Kosove
// @supportURL   https://github.com/zkisaboss/reorderedwordlist
// @match        https://skribbl.io/*
// @icon         https://skribbl.io/favicon.png
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// @compatible   chrome
// @compatible   firefox
// @compatible   opera
// @compatible   safari
// @compatible   edge
// @downloadURL https://update.greasyfork.org/scripts/503563/Skribbl%20AutoGuesser.user.js
// @updateURL https://update.greasyfork.org/scripts/503563/Skribbl%20AutoGuesser.meta.js
// ==/UserScript==

(function() {
'use strict';
/*
ToDo:
- Revamp UI 

Planned:
- Auto-change lobbies on drawing turn / before kick <— How does Typo switch lobbies?

Bugs:
- Filter breaks when another user shares your name

Ideas:
- Humanized auto-draw (inspired by Typo) with community support on GitHub.
*/

function createUI() {
    const bottomUI = document.createElement('div');
    bottomUI.id = 'bottom-ui';
    bottomUI.innerHTML = `
        <div id="settings-shelf" class="section">
            <button class="ui-btn" id="remaining-guesses">Remaining Guesses: 0</button>
            <button class="ui-btn" id="auto-guess">Auto Guess: OFF</button>
            <button class="ui-btn" id="export-answers">Export Answers</button>
            <button class="ui-btn ui-btn-secondary" id="get-special">Secret</button>
        </div>
        <div id="guess-shelf" class="section"></div>
        <style>
            #bottom-ui {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                background:
                  linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(200, 200, 255, 0.15));
                backdrop-filter: blur(30px) saturate(180%);
                -webkit-backdrop-filter: blur(30px) saturate(180%);
                border-top-left-radius: 24px;
                border-top-right-radius: 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.25);
                border-left: 1px solid rgba(255, 255, 255, 0.1);
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow:
                  0 -12px 30px rgba(0, 0, 0, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, 0.5);
                display: flex;
                flex-direction: column;
                z-index: 1000;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: transform 0.15s cubic-bezier(0.4, 0, 1, 1);
            }

            .hidden {
                transform: translateY(100%);
                transition: transform 0.15s cubic-bezier(0.4, 0, 1, 1);
            }

            .section {
                display: flex;
                gap: 12px;
                padding: 14px 24px;
                overflow-x: auto;
                white-space: nowrap;
                -webkit-overflow-scrolling: touch;
            }

            .section::-webkit-scrollbar {
                height: 6px;
            }

            .section::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }

            .ui-btn {
                flex: 0 0 auto;
                font-size: 15px;
                font-weight: 500;
                letter-spacing: 0.25px;
                padding: 10px 18px;
                border: 0.5px solid rgba(255, 255, 255, 0.25);
                border-radius: 14px;
                background: linear-gradient(135deg, rgba(120, 120, 255, 0.5), rgba(100, 100, 230, 0.35));
                color: #ffffff;
                cursor: pointer;
                box-shadow:
                  0 0 10px rgba(120, 120, 255, 0.5),
                  inset 0 0 2px rgba(255, 255, 255, 0.2),
                  0 1px 2px rgba(0, 0, 0, 0.15);
                transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
            }

            .ui-btn:hover {
                background: linear-gradient(135deg, rgba(140, 140, 255, 0.7), rgba(120, 120, 255, 0.6));
                box-shadow:
                  0 0 18px rgba(140, 140, 255, 0.75),
                  inset 0 0 3px rgba(255, 255, 255, 0.3);
                transform: scale(1.04);
            }

            .ui-btn:active {
                transform: scale(0.97);
                box-shadow:
                  0 0 8px rgba(100, 100, 200, 0.4),
                  inset 0 0 6px rgba(255, 255, 255, 0.2);
            }

            .ui-btn-secondary {
                display: inline-block;
                background: linear-gradient(135deg, rgba(255, 120, 255, 0.5), rgba(200, 100, 230, 0.35));
                color: #ffeaff;
                border: 0.5px solid rgba(255, 180, 255, 0.3);
            }

            .ui-btn-secondary:hover {
                background: linear-gradient(135deg, rgba(255, 140, 255, 0.7), rgba(220, 120, 240, 0.6));
                box-shadow:
                  0 0 18px rgba(255, 140, 255, 0.75),
                  inset 0 0 3px rgba(255, 255, 255, 0.3);
                transform: scale(1.04);
            }
        </style>
        `;
    document.body.appendChild(bottomUI);

    const ui = document.getElementById('bottom-ui');
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') ui.classList.add('hidden');
        if (e.key === 'ArrowUp') ui.classList.remove('hidden');
    });

}

createUI();


const correctAnswers = GM_getValue('correctAnswers', []);

async function fetchWords(url) {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.text();
    return data.split('\n').filter(elem => elem !== '');
}

async function fetchAndStoreLatestWordlist() {
    const words = await fetchWords('https://raw.githubusercontent.com/zkisaboss/reorderedwordlist/main/wordlist.txt');

    words.forEach(word => {
        if (!correctAnswers.includes(word)) correctAnswers.push(word);
    });
}

fetchAndStoreLatestWordlist();


let myUsername = '';

function findUsername() {
    const target = document.querySelector(".players-list");
    if (!target) return;

    const observer = new MutationObserver(() => {
        myUsername = document.querySelector(".me").textContent.replace(" (You)", "")
        observer.disconnect();
    });

    observer.observe(target, { childList: true });
}

findUsername();


function observeDrawingTurn() {
    const target = document.querySelector('.words');
    if (!target) return;

    const observer = new MutationObserver(() => {
        target.childNodes.forEach(word => {
            const text = word.textContent.toLowerCase();

            if (!correctAnswers.includes(text)) {
                correctAnswers.push(text);
                console.log(`New Word: ${text}`)
                GM_setValue('correctAnswers', correctAnswers);
            }
        });
    });

    observer.observe(target, { childList: true });
}

observeDrawingTurn();


// Core functionality
const remainingButton = document.getElementById('remaining-guesses');

const guessShelf = document.getElementById('guess-shelf');

let possibleWords = [];

function renderGuesses(possibleWords) {
    guessShelf.innerHTML = '';
    remainingButton.textContent = `Remaining Guesses: ${possibleWords.length}`;

    possibleWords.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'ui-btn';
        btn.textContent = word;
        btn.addEventListener('click', () => {
            document.querySelector('#game-chat input[data-translate="placeholder"]').value = word;
            document.querySelector('#game-chat form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        guessShelf.appendChild(btn);
    });
};

function generateGuesses() {
    const inputElem = document.querySelector('#game-chat input[data-translate="placeholder"]');
    const pattern = inputElem.value.toLowerCase().trim();
    const filteredWords = possibleWords.filter(word => word.startsWith(pattern));

    if (possibleWords.length === 1) {
        inputElem.value = possibleWords.shift();
        inputElem.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    renderGuesses(filteredWords);
}

function storeCorrectAnswer(word) {
    if (correctAnswers.includes(word)) {
        const index = correctAnswers.indexOf(word);
        const newIndex = Math.max(0, index - 1);
        correctAnswers.splice(index, 1);
        correctAnswers.splice(newIndex, 0, word);
    } else {
        correctAnswers.push(word);
        console.log(`New Word: ${word}`);
    }

    GM_setValue('correctAnswers', correctAnswers);
}

function filterHints(inputWords) {
    const hints = Array.from(document.querySelectorAll('.hints .hint'));
    const combined = hints.map(hint => hint.textContent === '_' ? '[a-z]' : hint.textContent).join('').toLowerCase();

    const allUncovered = hints.every(hint => hint.classList.contains('uncover'));
    if (allUncovered) {
        storeCorrectAnswer(combined);
        return [];
    }

    const regex = new RegExp(`^${combined}$`, 'i');
    return inputWords.filter(word => regex.test(word));
}

function observeHints() {
    const target = document.querySelector('.hints .container');
    if (!target) return;

    const observer = new MutationObserver(() => {
        possibleWords = filterHints(possibleWords);
        generateGuesses();
    });

    observer.observe(target, { childList: true, subtree: true });
}

observeHints();


//  https://youtu.be/Dd_NgYVOdLk
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

let previousWords = [];

function handleChatMessage(messageNode) {
    const messageColor = window.getComputedStyle(messageNode).color;
    const message = messageNode.textContent;

    if (messageColor === 'rgb(57, 117, 206)' && message.endsWith('is drawing now!')) {
        possibleWords = filterHints(correctAnswers);

        generateGuesses();
    }

    if (message.includes(': ')) {
        const [username, guess] = message.split(': ');
        possibleWords = possibleWords.filter(word => word !== guess);
        previousWords = possibleWords;

        if (username === myUsername) {
            possibleWords = possibleWords.filter(word => levenshteinDistance(word, guess) > 1);
        }

        generateGuesses();
    }

    if (messageColor === 'rgb(226, 203, 0)' && message.endsWith('is close!')) {
        const closeWord = message.replace(' is close!', '');
        possibleWords = previousWords.filter(word => levenshteinDistance(word, closeWord) === 1);

        generateGuesses();
    }
}

function observeChat() {
    const target = document.querySelector('.chat-content');
    if (!target) return;

    const observer = new MutationObserver(() => {
        const lastMessage = target.lastElementChild;
        if (lastMessage) handleChatMessage(lastMessage);
    });

    observer.observe(target, { childList: true });
}

observeChat();


function observeInput() {
    const inputElem = document.querySelector('#game-chat input[data-translate="placeholder"]');

    inputElem.addEventListener('input', generateGuesses);

    inputElem.addEventListener('keydown', ({ key }) => {
        if (key === 'Enter') {
            const guessDiv = guessShelf.querySelector('button');
            if (guessDiv) {
                inputElem.value = guessDiv.innerText;
                inputElem.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        }
    });
}

observeInput();


let autoGuessInterval;

let autoGuessing = false;

function startAutoGuessing() {
    if (autoGuessing) {
        autoGuessInterval = setInterval(() => {
            if (possibleWords.length > 0) {
                document.querySelector('#game-chat input[data-translate="placeholder"]').value = possibleWords.shift();
                document.querySelector('#game-chat form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        }, 8000);
    }
}

startAutoGuessing();


const autoGuessButton = document.getElementById('auto-guess');

function toggleAutoGuessing() {
    autoGuessing = !autoGuessing;
    autoGuessButton.innerHTML = `Auto Guess: ${autoGuessing ? 'ON' : 'OFF'}`;

    if (autoGuessing) {
        startAutoGuessing();
    } else {
        clearInterval(autoGuessInterval);
        autoGuessInterval = null;
    }
}

autoGuessButton.addEventListener('click', toggleAutoGuessing);


async function exportNewWords() {
    const old = await fetchWords('https://raw.githubusercontent.com/zkisaboss/reorderedwordlist/main/wordlist.txt');
    const newWords = correctAnswers.filter(word => !old.includes(word));

    const blob = new Blob([newWords.join('\n')], { type: 'text/plain;charset=utf-8' });

    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'newWords.txt';

    document.body.appendChild(anchor);
    anchor.click();

    document.body.removeChild(anchor);
}

const exportButton = document.getElementById('export-answers');

exportButton.addEventListener('click', exportNewWords);


const secretButton = document.getElementById('get-special');

function runSecret() {
    const avatars = document.querySelectorAll('.avatar-container .avatar');

    const interval = setInterval(() => {
        let allSecretsVisible = true;

        avatars.forEach(avatar => {
            const secret = avatar.querySelector('.special');

            if (getComputedStyle(secret).display === 'none') {
                avatar.click();
                allSecretsVisible = false;
            }
        });

        if (allSecretsVisible) clearInterval(interval);
    }, 15);
}

secretButton.addEventListener('click', runSecret);


function observeSecret() {
    const target = document.getElementById('home');
    if (!target) return;

    const observer = new MutationObserver(() => {
        secretButton.style.display = target.hasAttribute('style') ? 'none' : 'inline-block';
    });

    observer.observe(target, { attributes: true, attributeFilter: ['style'] });
}

observeSecret();
})();
