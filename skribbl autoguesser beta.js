// ==UserScript==
// @name         Skribbl Autoguesser Beta
// @name:zh-CN   Skribbl 自动猜词器
// @name:zh-TW   Skribbl 自動猜詞器
// @name:hi      स्क्रिब्ल ऑटोगेसर
// @name:es      Skribbl Adivinador Automático
// @namespace    http://tampermonkey.net/
// @supportURL   https://github.com/zkisaboss/reorderedwordlist
// @version      1.0
// @description  A script that helps you guess words in skribblio.
// @description:zh-CN 一个帮助你在skribblio中猜词的脚本。
// @description:zh-TW 一個幫助你在skribblio中猜詞的腳本。
// @description:hi एक स्क्रिप्ट जो आपको स्क्रिब्लियो में शब्दों का अनुमान लगाने में मदद करता है।
// @description:es Un script que te ayuda a adivinar palabras en skribblio.
// @author       Zach Kosove
// @match        http*://skribbl.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=skribbl.io
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// @compatible   chrome
// @compatible   firefox
// @compatible   opera
// @compatible   safari
// @compatible   edge
// ==/UserScript==

(function() {
'use strict';
/*
ToDo:
- Auto-leave / Auto-change lobbies before kick <— How does Typo switch lobbies?

Planned:
- Auto-sort possibleWords using a neural net (check if Google's model is open source)

Bugs:
- Filter breaks when another user shares your name
- Enter can toggle `autoGuessButton`

Ideas:
- Humanized auto-draw (inspired by Typo) with community support on GitHub. AutoSave other peoples drawings.
- Randomize auto-guess time
*/

// Variables
let autoGuessing = false;


// UI Elements
const parentElement = document.createElement('div');
Object.assign(parentElement.style, { position: 'fixed', bottom: '0', right: '0', width: '100%', height: 'auto' });
document.body.appendChild(parentElement);

const guessElem = document.createElement('div');
Object.assign(guessElem.style, { padding: '10px', backgroundColor: 'white', maxHeight: '200px', overflowX: 'auto', whiteSpace: 'nowrap', width: '100%' });
parentElement.appendChild(guessElem);

const settingsElem = document.createElement('div');
Object.assign(settingsElem.style, { position: 'absolute', bottom: 'calc(100%)', right: '0', padding: '10px 5px', display: 'flex', alignItems: 'center', gap: '10px' });
parentElement.appendChild(settingsElem);

const autoGuessButton = document.createElement('button');
autoGuessButton.innerHTML = `Auto Guess: ${autoGuessing ? 'ON' : 'OFF'}`;
Object.assign(autoGuessButton.style, { padding: '5px 10px', fontSize: '12px', backgroundColor: '#333', color: '#fff' });
settingsElem.appendChild(autoGuessButton);

const exportButton = document.createElement('button');
exportButton.innerHTML = 'Export Answers';
Object.assign(exportButton.style, { padding: '5px 10px', fontSize: '12px', backgroundColor: '#333', color: '#fff' });
settingsElem.appendChild(exportButton);


// Functions
const correctAnswers = GM_getValue('correctAnswers', []);

async function fetchWords(url) {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.text();
    return data.split('\n');
}

async function fetchAndStoreLatestWordlist() {
    const words = await fetchWords('https://raw.githubusercontent.com/zkisaboss/reorderedwordlist/main/wordlist.txt');

    words.forEach(word => {
        if (!correctAnswers.includes(word)) correctAnswers.push(word);
    });
}

fetchAndStoreLatestWordlist();


let myUsername = '';

function setUsername() {
    document.querySelectorAll(".player .player-name").forEach(playerNameElem => {
        const playerName = playerNameElem.textContent;
        if (playerName.endsWith(" (You)")) {
            myUsername = playerName.replace(" (You)", "");
        }
    });
}

function observePlayers() {
    const playersContainer = document.querySelector(".players-list");
    if (playersContainer) {
        const observer = new MutationObserver(() => {
            if (myUsername === '') {
                setUsername();
            } else {
                observer.disconnect();
            }
        });
        observer.observe(playersContainer, { childList: true, subtree: true });
    }
}

observePlayers();


function observeDrawingTurn() {
    const wordsElement = document.querySelector('.words');

    const processNewChildNodes = (childNodes) => {
        childNodes.forEach(childNode => {
            const textContent = childNode.textContent.toLowerCase().trim();
            if (textContent && !correctAnswers.includes(textContent)) {
                correctAnswers.push(textContent);
                GM_setValue('correctAnswers', correctAnswers);
            }
        });
    };

    const mutationCallback = (mutationsList) => {
        const mutation = mutationsList.find(mutation => mutation.type === 'childList');
        if (mutation) {
            processNewChildNodes(mutation.target.childNodes);
        }
    };

    const observer = new MutationObserver(mutationCallback);

    observer.observe(wordsElement, { subtree: true, childList: true });
}

observeDrawingTurn();


// Core functionality
let possibleWords = [];

function renderGuesses(possibleWords) {
    guessElem.innerHTML = '';

    possibleWords.forEach((word, index) => {
        const wordElem = document.createElement('div');
        wordElem.innerHTML = word;
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
    const hintPattern = Array.from(document.querySelectorAll('.hints .hint'))
        .map(elem => elem.textContent === '_' ? '[a-z]' : elem.textContent)
        .join('');
    const hintRegex = new RegExp(`^${hintPattern}$`, 'i');
    return inputWords.filter(word => hintRegex.test(word));
}

function observeHints() {
    const hintTargets = [
        document.querySelector('.hints .container'),
        document.querySelector('.words'),
        document.querySelector('#game-word')
    ].filter(Boolean);

    const observer = new MutationObserver(() => {
        const hintElems = Array.from(document.querySelectorAll('.hints .hint'));
        const allUncovered = hintElems.every(elem => elem.classList.contains('uncover'));

        if (allUncovered) {
            const correctAnswer = hintElems.map(elem => elem.textContent).join('').trim().toLowerCase();

            const x = 1;
            if (correctAnswers.includes(correctAnswer)) {
                const currentIndex = correctAnswers.indexOf(correctAnswer);
                const newIndex = Math.max(0, currentIndex - x);
                correctAnswers.splice(currentIndex, 1);
                correctAnswers.splice(newIndex, 0, correctAnswer);
            } else {
                correctAnswers.push(correctAnswer);
            }

            GM_setValue('correctAnswers', correctAnswers);
            possibleWords = [];
        } else {
            possibleWords = filterHints(possibleWords);
        }

        generateGuesses();
    });
    hintTargets.forEach(target => observer.observe(target, { childList: true, subtree: true }));
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

    if (messageColor === 'rgb(57, 117, 206)') {
        possibleWords = filterHints(correctAnswers);

        generateGuesses();

    } else if (message.includes(': ')) {
        const [username, guess] = message.split(': ');
        possibleWords = possibleWords.filter(word => word !== guess);
        previousWords = possibleWords;

        if (username === myUsername) {
            possibleWords = possibleWords.filter(word => levenshteinDistance(word, guess) > 1);
        }

        generateGuesses();

    } else if (messageColor === 'rgb(226, 203, 0)' && message.endsWith('is close!')) {
        const closeWord = message.replace(' is close!', ''); // works for multi-word guesses?
        possibleWords = previousWords.filter(word => levenshteinDistance(word, closeWord) === 1);

        generateGuesses();
    }
}

function observeChat() {
    const chatContainer = document.querySelector('.chat-content');
    if (chatContainer) {
        const observer = new MutationObserver(mutationsList => {
            mutationsList.forEach(mutation => {
                if (mutation.addedNodes.length > 0) handleChatMessage(mutation.addedNodes[0]);
            });
        });
        observer.observe(chatContainer, { childList: true });
    }
}

observeChat();


function observeInput() {
    const inputElem = document.querySelector('#game-chat input[data-translate="placeholder"]');

    inputElem.addEventListener('input', generateGuesses);

    inputElem.addEventListener('keydown', ({ key }) => {
        if (key === 'Enter') {
            inputElem.value = guessElem.querySelector('div').innerText;
            inputElem.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
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
        }, 10000);
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
    // anchor.style.display = 'none'; // Optional but keeps things tidy

    document.body.appendChild(anchor);
    anchor.click();

    document.body.removeChild(anchor);
}


exportButton.addEventListener('click', exportNewWords);
})();
