// Teachable Machine model files
const MODEL_URL    = 'model/model.json';
const METADATA_URL = 'model/metadata.json';

// Game logic — which sign beats which
const BEATS = {
    Rock:     'Scissors',
    Paper:    'Rock',
    Scissors: 'Paper'
};

const EMOJI = {
    Rock:     '✊',
    Paper:    '✋',
    Scissors: '✌️'
};

// Global state
let model         = null;
let webcam        = null;
let maxPredictions = 0;
let isFeedRunning = false;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Show one screen and hide the others
function showScreen(screenId) {
    const screens = ['screen-intro', 'screen-game', 'screen-result'];
    for (const id of screens) {
        document.getElementById(id).classList.toggle('hidden', id !== screenId);
    }
}

// Called each animation frame to keep the webcam canvas refreshed
function runFeedLoop() {
    if (!isFeedRunning) return;
    webcam.update();
    requestAnimationFrame(runFeedLoop);
}

// Load the model and start the webcam
async function startCamera() {
    const btnStart = document.getElementById('btn-start');
    btnStart.textContent = 'Loading…';
    btnStart.disabled = true;

    // Load the Teachable Machine model and its class metadata
    model = await tmImage.load(MODEL_URL, METADATA_URL);
    maxPredictions = model.getTotalClasses();

    // Set up the webcam (flip=true mirrors it like a selfie camera)
    const flip = true;
    webcam = new tmImage.Webcam(640, 480, flip);
    await webcam.setup();
    await webcam.play();

    // Attach the webcam's canvas element to the page
    document.getElementById('webcam-container').appendChild(webcam.canvas);

    isFeedRunning = true;
    runFeedLoop();
    showScreen('screen-game');
}

// Countdown, capture the frame, classify it, and show the result
async function playRound() {
    document.getElementById('btn-ready').disabled = true;

    // --- Countdown ---
    const countdownEl = document.getElementById('countdown');
    countdownEl.classList.remove('hidden');
    for (const n of [3, 2, 1]) {
        countdownEl.textContent = n;
        await wait(900);
    }
    countdownEl.classList.add('hidden');

    // --- Capture ---
    // Freeze the feed so the frame stays fixed during classification
    isFeedRunning = false;
    // Save the frozen frame as an image for the result screen
    const snapshot = webcam.canvas.toDataURL('image/jpeg', 0.85);

    // --- Classification ---
    // Run the model on the captured frame — returns [{className, probability}, ...]
    const predictions = await model.predict(webcam.canvas);

    // Player's result: class with the highest confidence score
    let playerPrediction = predictions[0];
    for (const prediction of predictions) {
        if (prediction.probability > playerPrediction.probability) {
            playerPrediction = prediction;
        }
    }
    const playerClass = playerPrediction.className;

    // --- Computer's random pick ---
    const randomIndex = Math.floor(Math.random() * maxPredictions);
    const aiClass = predictions[randomIndex].className;

    // --- Determine outcome ---
    let outcome;
    if (BEATS[playerClass] === aiClass) {
        outcome = 'You win!';
    } else if (BEATS[aiClass] === playerClass) {
        outcome = 'Computer wins!';
    } else {
        outcome = "It's a draw!";
    }

    // --- Display result ---
    document.getElementById('result-photo').src = snapshot;
    document.getElementById('outcome').textContent = outcome;
    document.getElementById('details').textContent =
        `You: ${EMOJI[playerClass]} ${playerClass}  vs  Computer: ${EMOJI[aiClass]} ${aiClass}`;

    showScreen('screen-result');
}

// Resume the live feed and return to the game screen
function playAgain() {
    document.getElementById('btn-ready').disabled = false;
    isFeedRunning = true;
    runFeedLoop();
    showScreen('screen-game');
}

// Button event listeners
document.getElementById('btn-start').addEventListener('click', startCamera);
document.getElementById('btn-ready').addEventListener('click', playRound);
document.getElementById('btn-again').addEventListener('click', playAgain);
