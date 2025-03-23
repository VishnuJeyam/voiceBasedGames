// Game variables
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let carX = canvas.width / 2 - 25; // Starting position of the car
let carY = canvas.height - 150;
let carSpeed = 0;
let carDirection = 0; // 0: straight, -1: left, 1: right
let carImage = new Image();
carImage.src = 'car.png'; // Add your car image here
let carWidth = 50;
let carHeight = 100;
let gameRunning = false;
let obstacles = [];
const maxSpeed = 10; // Increased max speed for more noticeable difference
const steerStrength = 5; // Increased steering strength
const obstacleSpeed = 10; // Increased obstacle speed
const obstacleFrequency = 1000; // Increased frequency to add obstacles (milliseconds)
let score = 0;
let highScore = 0;

// Track variables
let trackLines = [];
const lineSpeed = 5;
const lineHeight = 30;
const lineWidth = 5;
const lineSpacing = 40;

// Threshold frequency (adjustable via slider)
let thresholdFrequency = 30;

// Audio context and microphone variables
let audioContext;
let analyser;
let dataArray;

// Obstacle images
let obstacleImages = [];
for (let i = 2; i <= 7; i++) {
    let img = new Image();
    img.src = `car${i}.png`; // Load images car2.png, car3.png, car4.png
    obstacleImages.push(img);
}

// Crash image
let crashImage = new Image();
crashImage.src = 'crash.png'; // Add your crash image here

// Music and sound effects
let backgroundMusic = new Audio('background-music.mp3');
let accelerationSound = new Audio('acceleration-sound.mp3');
let gameOverSound = new Audio('gameover-sound.mp3');

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

// Start the game
function startGame() {
    gameRunning = true;
    carX = canvas.width / 2 - 25;
    carY = canvas.height - 150;
    carSpeed = 0;
    carDirection = 0;
    obstacles = [];
    trackLines = [];
    score = 0;
    for (let i = 0; i < canvas.height / (lineHeight + lineSpacing); i++) {
        trackLines.push({ y: i * (lineHeight + lineSpacing) });
    }
    document.getElementById('controls').style.display = 'none';
    backgroundMusic.loop = true; // Loop background music
    backgroundMusic.play(); // Start background music
    gameLoop();
    setInterval(addObstacle, obstacleFrequency); // Start adding obstacles
}

// Stop the game
function stopGame() {
    gameRunning = false;
    document.getElementById('controls').style.display = 'flex';
    backgroundMusic.pause(); // Stop background music
    backgroundMusic.currentTime = 0; // Reset background music
    if (score > highScore) {
        highScore = score; // Update high score
    }
}

// Update the threshold frequency from the slider
function updateThreshold(value) {
    thresholdFrequency = value;
    document.getElementById('thresholdDisplay').innerText = value;
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get the microphone input volume
    const volume = getVoiceVolume();

    // Control car speed based on volume
    if (volume < thresholdFrequency) {
        carSpeed = 0; // No voice, car stops
        accelerationSound.pause(); // Pause acceleration sound
        accelerationSound.currentTime = 0; // Reset acceleration sound
    } else if (volume < thresholdFrequency * 1.5) {
        carSpeed = maxSpeed * 0.5; // Low voice, car goes slow
        if (accelerationSound.paused) accelerationSound.play(); // Play acceleration sound
    } else if (volume < thresholdFrequency * 2) {
        carSpeed = maxSpeed * 0.75; // Moderate voice, car goes moderate speed
        if (accelerationSound.paused) accelerationSound.play(); // Play acceleration sound
    } else {
        carSpeed = maxSpeed; // High voice, car goes high speed
        if (accelerationSound.paused) accelerationSound.play(); // Play acceleration sound
    }

    // Move the car
    carX += carDirection * steerStrength;
    carX = Math.max(0, Math.min(canvas.width - carWidth, carX)); // Keep car within track

    // Move the track lines
    for (let i = 0; i < trackLines.length; i++) {
        trackLines[i].y += carSpeed;
        if (trackLines[i].y > canvas.height) {
            trackLines[i].y = -lineHeight;
        }

        // Draw track lines
        ctx.fillStyle = 'white';
        ctx.fillRect(canvas.width / 2 - lineWidth / 2, trackLines[i].y, lineWidth, lineHeight);
    }

    // Draw the car
    ctx.drawImage(carImage, carX, carY, carWidth, carHeight);

    // Move and draw obstacles
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].y += obstacleSpeed;
        ctx.drawImage(obstacles[i].image, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);

        // Check for collisions with more precise detection
        const crashDetected = carX < obstacles[i].x + obstacles[i].width - 20 &&
            carX + carWidth > obstacles[i].x + 20 &&
            carY < obstacles[i].y + obstacles[i].height - 20 &&
            carY + carHeight > obstacles[i].y + 20;

        if (crashDetected) {
            ctx.drawImage(crashImage, carX, carY, carWidth, carHeight); // Draw crash image on collision
            gameOverSound.play(); // Play game over sound
            stopGame(); // End the game on collision
            alert("Game Over! You hit an obstacle.");
            return;
        }
    }

    // Remove off-screen obstacles
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height);

    // Update and display score
    score += 1;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`High Score: ${highScore}`, 10, 60);

    requestAnimationFrame(gameLoop);
}

// Function to add an obstacle
function addObstacle() {
    const obstacleWidth = 80; // Increased width of obstacles
    const obstacleHeight = 80; // Increased height of obstacles
    const obstacleX = Math.random() * (canvas.width - obstacleWidth);
    const randomIndex = Math.floor(Math.random() * obstacleImages.length);
    const obstacleImage = obstacleImages[randomIndex];
    obstacles.push({ x: obstacleX, y: -obstacleHeight, width: obstacleWidth, height: obstacleHeight, image: obstacleImage });
}

// Keydown event listener for arrow keys
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        carDirection = -1;
    } else if (event.key === 'ArrowRight') {
        carDirection = 1;
    }
});

// Keyup event listener to stop the car from steering
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        carDirection = 0;
    }
});

// Call setupMicrophone when the page loads
window.onload = function() {
    setupMicrophone();
};
