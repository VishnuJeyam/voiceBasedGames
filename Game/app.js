// Game variables
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let birdY = canvas.height / 2; // Starting position of the bird
let birdVelocity = 0; // Bird's vertical speed
let birdImage = new Image();
birdImage.src = 'bird.png'; // Add your bird image here
let birdWidth = 50; // Default width before the image loads
let birdHeight = 50; // Default height before the image loads
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0; // Load high score from local storage
let pipes = [];
let gravity = parseFloat(document.getElementById('gravitySlider').value); // Gravity from slider
let jumpStrength = -5;
let pipeSpeed = parseFloat(document.getElementById('speedSlider').value); // Speed from slider
let gapHeight = 300; // Increased gap height to make it easier
let pipeSpacing = 300; // Minimum distance between pipes
let sensitivityThreshold = parseFloat(document.getElementById('thresholdSlider').value); // Sensitivity threshold from slider

// Audio variables
let jumpSound = new Audio('jump.mp3');
let gameOverSound = new Audio('gameover.mp3');
let backgroundMusic = new Audio('background.mp3');

// Ensure the game starts only after the audio files are loaded
let audioFilesLoaded = false;
backgroundMusic.oncanplaythrough = function() {
    audioFilesLoaded = true;
};

// Audio context and microphone variables
let audioContext;
let analyser;
let dataArray;

// Set up microphone access and audio context
function setupMicrophone() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Create an audio context
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);

                // Connect the source to the analyser
                source.connect(analyser);

                // Set up the data array
                analyser.fftSize = 256;
                dataArray = new Uint8Array(analyser.frequencyBinCount);
            })
            .catch(err => {
                console.error('Error accessing microphone:', err);
            });
    } else {
        console.error('getUserMedia not supported on this browser.');
    }
}

// Get the volume from the microphone input
function getVoiceVolume() {
    if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        let average = sum / dataArray.length;
        return average; // Return the average volume level
    }
    return 0;
}

// Update the game variables from sliders
function updateGameSettings() {
    pipeSpeed = parseFloat(document.getElementById('speedSlider').value);
    sensitivityThreshold = parseFloat(document.getElementById('thresholdSlider').value);
    gravity = parseFloat(document.getElementById('gravitySlider').value);
}

// Start the game
function startGame() {
    if (!audioFilesLoaded) {
        alert("Audio is still loading, please wait a moment and try again.");
        return;
    }

    updateGameSettings(); // Update settings before starting
    gameRunning = true;
    score = 0;
    pipes = [];
    birdY = canvas.height / 2; // Reset bird position
    birdVelocity = 0; // Reset velocity
    document.getElementById('controls').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    createPipe(); // Create an initial pipe
    backgroundMusic.loop = true;
    backgroundMusic.play();
    gameLoop();
}

// Stop the game
function stopGame() {
    gameRunning = false;
    backgroundMusic.pause();
    gameOverSound.play();

    // Update high score if the current score is higher
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore); // Save the new high score in local storage
    }

    document.getElementById('finalScore').innerText = `Score: ${score}\nHigh Score: ${highScore}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

// Retry the game
function retryGame() {
    startGame();
}

// Update the game loop for Flappy Bird-like gameplay
function gameLoop() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get the microphone input volume
    const volume = getVoiceVolume();

    if (volume > sensitivityThreshold) {
        birdVelocity = jumpStrength; // Jump
        jumpSound.play();
    }

    // Apply gravity to the bird
    birdVelocity += gravity;
    birdY += birdVelocity;

    // Clamp bird position to keep it on screen
    birdY = Math.max(0, Math.min(canvas.height - birdHeight, birdY));

    // Move and draw pipes
    for (let i = 0; i < pipes.length; i++) {
        pipes[i].x -= pipeSpeed;

        // Draw the pipes
        ctx.fillStyle = 'green';
        ctx.fillRect(pipes[i].x, 0, pipes[i].width, pipes[i].height); // Top pipe
        ctx.fillRect(pipes[i].x, pipes[i].height + gapHeight, pipes[i].width, canvas.height - pipes[i].height - gapHeight); // Bottom pipe

        // Check for collision
        if (
            (50 < pipes[i].x + pipes[i].width &&
                50 + birdWidth > pipes[i].x &&
                (birdY < pipes[i].height || birdY + birdHeight > pipes[i].height + gapHeight))
        ) {
            stopGame();
            return;
        }

        // Check if the bird crosses the pipe
        if (pipes[i].x + pipes[i].width < 50 && !pipes[i].passed) {
            score++; // Increment score for each pipe crossed
            pipes[i].passed = true; // Mark this pipe as passed
        }
    }

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

    // Create new pipe if needed
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - pipeSpacing) {
        createPipe();
    }

    // Update the score
    displayScore();

    // Draw the bird
    ctx.drawImage(birdImage, 50, birdY, birdWidth, birdHeight);

    requestAnimationFrame(gameLoop);
}

// Display the score
function displayScore() {
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Score: ${score} High Score: ${highScore}`, canvas.width - 200, 30);
}

// Function to create a pipe
function createPipe() {
    const pipeX = canvas.width;
    const pipeWidth = 50;
    const pipeHeight = Math.random() * (canvas.height - gapHeight - 50) + 50;

    pipes.push({ x: pipeX, width: pipeWidth, height: pipeHeight, passed: false });
}

// When the bird image loads, update the bird's width and height
birdImage.onload = function () {
    birdWidth = birdImage.width * 0.5; // Resize bird to 50% of its original size
    birdHeight = birdImage.height * 0.5;
};

// Call setupMicrophone when the page loads
window.onload = function () {
    setupMicrophone();
};
