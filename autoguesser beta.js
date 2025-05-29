// ==UserScript==
// @name         Skribbl AutoGuesser Beta
// @name:zh-CN   Skribbl 自动猜词器
// @name:zh-TW   Skribbl 自動猜詞器
// @name:hi      Skribbl स्वतः अनुमान स्क्रिप्ट
// @name:es      Skribbl Adivinador Automático
// @namespace    http://tampermonkey.net/
// @version      1.02
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

(function() {
'use strict';

// Variables
let autoGuessing = false;


// == UI Elements ==
const UI_STYLE = {
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    fontSize: '14px',
    color: '#2d2f35',
    background: '#f9f9fb',
    shadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    borderRadius: '9999px',
    button: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '600',
        border: 'none',
        borderRadius: '9999px',
        background: '#6366f1',
        color: '#fff',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        transition: 'background 0.3s ease',
        hover: '#4f46e5'
    }
};

// == Helpers ==
const apply = (el, styles) => {
    const { hover, ...s } = styles;
    Object.assign(el.style, s);
    if (hover) {
        const orig = s.background;
        el.onmouseenter = () => el.style.background = hover;
        el.onmouseleave = () => el.style.background = orig;
    }
    return el;
};

const el = (tag, style, text, click) => {
    const e = apply(document.createElement(tag), style);
    if (text) e.textContent = text;
    if (click) e.onclick = click;
    return e;
};

// == UI ==
const container = el('div', {
    position: 'fixed',
    bottom: '0',
    right: '0',
    width: '100%',
    zIndex: '10000',
    fontFamily: UI_STYLE.fontFamily,
    fontSize: UI_STYLE.fontSize,
    color: UI_STYLE.color
});
document.body.appendChild(container);

const bar = el('div', {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '10px',
    padding: UI_STYLE.button.padding,
    background: UI_STYLE.background,
    boxShadow: UI_STYLE.shadow,
    borderTopLeftRadius: UI_STYLE.borderRadius,
    borderTopRightRadius: UI_STYLE.borderRadius
});
container.appendChild(bar);

const guessDisplay = el('div', {
    padding: UI_STYLE.button.padding,
    background: UI_STYLE.background,
    height: '60px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    width: '100%',
    boxShadow: UI_STYLE.shadow
});
container.appendChild(guessDisplay);

// == Buttons ==
const btnStyle = UI_STYLE.button;
const guessCounter = el('div', { ...btnStyle, userSelect: 'none' }, 'Remaining Guesses: 0');
const autoBtn = el('button', btnStyle, `Auto Guess: ${autoGuessing ? 'ON' : 'OFF'}`);
const exportBtn = el('button', btnStyle, 'Export Answers');

[guessCounter, autoBtn, exportBtn].forEach(b => bar.appendChild(b));

// == Render ==
function renderGuesses(words) {
    guessDisplay.innerHTML = '';
    guessCounter.textContent = `Remaining Guesses: ${words.length}`;

    words.forEach(word => {
        const w = el('button', {
            ...btnStyle,
            display: 'inline-block',
            margin: '3px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
            hover: btnStyle.hover
        }, word, () => {
            const input = document.querySelector('#game-chat input[data-translate="placeholder"]');
            const form = document.querySelector('#game-chat form');
            input.value = word;
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        guessDisplay.appendChild(w);
    });
}


// Functions
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

    observer.observe(target, { childList: true});
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
let possibleWords = [];
/*
function renderGuesses(possibleWords) {
    guessElem.innerHTML = '';

    remainingGuesses.innerHTML = `Remaining Guesses: ${possibleWords.length}`;

    possibleWords.forEach(word => {
          const wordElem = document.createElement('div');
          wordElem.textContent = word;
          Object.assign(wordElem.style, {
              fontWeight: 'bold',
              display: 'inline-block',
              padding: '5px',
              marginRight: '2px',
              color: 'white',
              textShadow: '2px 2px 2px black',
              backgroundColor: 'hsl(205, 100%, 50%)'
          });

          wordElem.addEventListener('mouseenter', () => {
              if (!wordElem.classList.contains('pressed')) wordElem.style.backgroundColor = 'lightgray';
              wordElem.classList.add('hovered');
          });

          wordElem.addEventListener('mouseleave', () => {
              if (!wordElem.classList.contains('pressed')) wordElem.style.backgroundColor = 'hsl(205, 100%, 50%)';
              wordElem.classList.remove('hovered');
          });

          wordElem.addEventListener('mousedown', () => {
              wordElem.classList.add('pressed');
              wordElem.style.backgroundColor = 'gray';
          });

          wordElem.addEventListener('mouseup', () => {
              wordElem.classList.remove('pressed');
              wordElem.style.backgroundColor = wordElem.classList.contains('hovered') ? 'lightgray' : 'hsl(205, 100%, 50%)';
          });

          wordElem.addEventListener('click', () => {
              document.querySelector('#game-chat input[data-translate="placeholder"]').value = word;
              document.querySelector('#game-chat form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          });

          guessElem.appendChild(wordElem);
    });
}
*/
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

function filterHints(inputWords) {
    const hints = Array.from(document.querySelectorAll('.hints .hint'));

    // turn into helper function or use a cleaner method to find allUncovered
    const allUncovered = hints.every(elem => elem.classList.contains('uncover'));
    if (allUncovered) {
        const correctAnswer = hints.map(elem => elem.textContent).join('').toLowerCase();

        if (correctAnswers.includes(correctAnswer)) {
            const currentIndex = correctAnswers.indexOf(correctAnswer);
            const newIndex = Math.max(0, currentIndex - 1);
            correctAnswers.splice(currentIndex, 1);
            correctAnswers.splice(newIndex, 0, correctAnswer);
        } else {
            correctAnswers.push(correctAnswer);
            console.log(`New Word: ${correctAnswer}`)
        }

        GM_setValue('correctAnswers', correctAnswers);
        return [];
    }

    const hintPattern = hints.map(hint => hint.textContent === '_' ? '[a-z]' : hint.textContent).join('');
    const hintRegex = new RegExp(`^${hintPattern}$`, 'i');
    return inputWords.filter(word => hintRegex.test(word));
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
            const guessDiv = guessElem.querySelector('div');
            if (guessDiv) {
                inputElem.value = guessDiv.innerText;
                inputElem.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        }
    });
}

observeInput();


let autoGuessInterval;

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

exportButton.addEventListener('click', exportNewWords);
})();
