const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

const gridSize = 20;
let snake = [{ x: 10, y: 10 }];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let gameLoop;
let isGameOver = false;

function createFood() {
    food = {
        x: Math.floor(Math.random() * (canvas.width / gridSize)),
        y: Math.floor(Math.random() * (canvas.height / gridSize))
    };
}

function draw() {
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    snake.forEach(segment => {
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
    });

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function update() {
    if (isGameOver) {
        return;
    }

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreDisplay.textContent = score;
        createFood();
    } else {
        snake.pop();
    }

    if (
        head.x < 0 ||
        head.x >= canvas.width / gridSize ||
        head.y < 0 ||
        head.y >= canvas.height / gridSize ||
        checkCollision()
    ) {
        isGameOver = true;
        alert('Game Over! Votre score est de ' + score);
        document.location.reload(); // Recommence le jeu
        return;
    }

    draw();
}

function checkCollision() {
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            return true;
        }
    }
    return false;
}

document.addEventListener('keydown', e => {
    const key = e.key;
    if (key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
    if (key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
    if (key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
    if (key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
});

function startGame() {
    createFood();
    gameLoop = setInterval(update, 100);
}

startGame();