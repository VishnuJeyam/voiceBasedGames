// Game variables
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let spaceshipX = canvas.width / 2 - 25;
let spaceshipY = canvas.height - 150;
let spaceshipSpeed = 10; // Increased speed for smoother movement
let spaceshipDirectionX = 0;
let spaceshipDirectionY = 0;
let spaceshipImage = new Image();
spaceshipImage.src = 'spaceship.png';
let spaceshipWidth = 50;
let spaceshipHeight = 100;
let gameRunning = false;
let obstacles = [];
let lasers = []; // Array to hold lasers
const maxSpeed = 10;
const steerStrength = 10; // Increased for more responsive turning
const obstacleSpeed = 8; // Increased speed for obstacles
const obstacleFrequency = 1000;
let score = 0;
let highScore = 0;
let lives = 3; // Number of lives

// Threshold frequency
let thresholdFrequency = 30;

// Audio context and microphone variables
let audioContext;
let analyser;
let dataArray;
let lastLaserShotTime = 0; // Time of the last laser shot
const laserShootInterval = 200; // Time between laser shots in milliseconds

// Audio elements
const backgroundMusic = document.getElementById('backgroundMusic');
const laserSound = document.getElementById('laserSound');
const gameOverSound = document.getElementById('gameOverSound');

// Obstacle images
let obstacleImages = [];
for (let i = 1; i <= 6; i++) {
    let img = new Image();
    img.src = `obstacle${i}.png`;
    obstacleImages.push(img);
}

// Background image
const backgroundImage = new Image();
backgroundImage.src = 'background.png'; // Background image path

// Set up microphone access and audio context
function setupMicrophone() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
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
        return average;
    }
    return 0;
}

// Start the game
function startGame() {
    gameRunning = true;
    spaceshipX = canvas.width / 2 - 25;
    spaceshipY = canvas.height - 150;
    spaceshipSpeed = 7; // Reset speed
    spaceshipDirectionX = 0;
    spaceshipDirectionY = 0;
    obstacles = [];
    lasers = []; // Reset lasers
    score = 0;
    lives = 3; // Reset lives at the start
    document.getElementById('controls').style.display = 'none';
    backgroundMusic.play(); // Start playing background music
    gameLoop();
    setInterval(addObstacle, obstacleFrequency);
}

// Stop the game
function stopGame() {
    gameRunning = false;
    document.getElementById('controls').style.display = 'flex';
    backgroundMusic.pause(); // Pause background music
    if (score > highScore) {
        highScore = score;
    }
    gameOverSound.play(); // Play game over sound
}

// Update the threshold frequency from the slider
function updateThreshold(value) {
    thresholdFrequency = value;
    document.getElementById('thresholdDisplay').innerText = value;
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    // Draw background image
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    const volume = getVoiceVolume();

    // Check if enough time has passed since the last laser shot
    if (volume > thresholdFrequency && Date.now() - lastLaserShotTime > laserShootInterval) {
        shootLaser();
        lastLaserShotTime = Date.now(); // Update the last shot time
    }

    // Update spaceship position for smoother movement
    spaceshipX += spaceshipDirectionX * spaceshipSpeed;
    spaceshipY += spaceshipDirectionY * spaceshipSpeed;
    spaceshipX = Math.max(0, Math.min(canvas.width - spaceshipWidth, spaceshipX));
    spaceshipY = Math.max(0, Math.min(canvas.height - spaceshipHeight, spaceshipY));

    ctx.drawImage(spaceshipImage, spaceshipX, spaceshipY, spaceshipWidth, spaceshipHeight);

    // Move lasers
    for (let i = 0; i < lasers.length; i++) {
        lasers[i].y -= 10; // Increased laser speed
        ctx.fillStyle = 'red';
        ctx.fillRect(lasers[i].x, lasers[i].y, lasers[i].width, lasers[i].height);

        // Check for laser collision with obstacles
        for (let j = 0; j < obstacles.length; j++) {
            if (lasers[i].x < obstacles[j].x + obstacles[j].width &&
                lasers[i].x + lasers[i].width > obstacles[j].x &&
                lasers[i].y < obstacles[j].y + obstacles[j].height &&
                lasers[i].y + lasers[i].height > obstacles[j].y) {
                // Remove the laser and obstacle on collision
                lasers.splice(i, 1);
                obstacles.splice(j, 1);
                score += 10; // Increase score for hitting an obstacle
                i--; // Adjust index after removing laser
                break;
            }
        }
    }

    // Remove lasers that have left the screen
    lasers = lasers.filter(laser => laser.y > 0);

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].y += obstacleSpeed; // Increased obstacle speed
        ctx.drawImage(obstacles[i].image, obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);

        if (spaceshipX < obstacles[i].x + obstacles[i].width &&
            spaceshipX + spaceshipWidth > obstacles[i].x &&
            spaceshipY < obstacles[i].y + obstacles[i].height &&
            spaceshipY + spaceshipHeight > obstacles[i].y) {
            lives--; // Decrease life on collision
            obstacles.splice(i, 1); // Remove the collided obstacle
            i--; // Adjust index after removing obstacle
            if (lives === 0) {
                stopGame(); // End the game if no lives are left
                alert("Game Over! You have no lives left.");
                return;
            }
        }
    }

    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height);

    score += 1;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`High Score: ${highScore}`, 10, 60);
    ctx.fillText(`Lives: ${lives}`, 10, 90); // Display remaining lives

    requestAnimationFrame(gameLoop);
}

// Add a new obstacle to the game
function addObstacle() {
    const obstacle = {
        x: Math.random() * (canvas.width - 75), // Increased obstacle width
        y: -75, // Increased obstacle height
        width: 75, // Increased obstacle width
        height: 75, // Increased obstacle height
        image: obstacleImages[Math.floor(Math.random() * obstacleImages.length)]
    };
    obstacles.push(obstacle);
}

// Shoot a laser
function shootLaser() {
    const laser = {
        x: spaceshipX + spaceshipWidth / 2 - 3, // Centered laser
        y: spaceshipY,
        width: 6, // Reduced laser width
        height: 20
    };
    lasers.push(laser);
    laserSound.play(); // Play laser shooting sound
}

// Handle keyboard input
window.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft') {
        spaceshipDirectionX = -1;
    } else if (event.key === 'ArrowRight') {
        spaceshipDirectionX = 1;
    } else if (event.key === 'ArrowUp') {
        spaceshipDirectionY = -1;
    } else if (event.key === 'ArrowDown') {
        spaceshipDirectionY = 1;
    }
});

window.addEventListener('keyup', function(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        spaceshipDirectionX = 0;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        spaceshipDirectionY = 0;
    }
});

// Initialize microphone and start game
setupMicrophone();
