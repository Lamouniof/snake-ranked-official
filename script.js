    // --- NOTE IMPORTANTE : CE CODE EST NON SÉCURISÉ POUR LA PRODUCTION ---
    // Le stockage des comptes dans des fichiers JSON est EXTRÊMEMENT DANGEREUX
    // pour la sécurité des données utilisateur et la stabilité de l'application.
    // Cette implémentation est faite uniquement pour répondre à la demande spécifique,
    // mais elle n'est PAS RECOMMANDÉE pour un usage réel.

    const socket = io(); // Connecte au serveur Socket.IO (par défaut: même hôte et port)

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let currentBoardSize = 20; // Default for solo/ranked 1v1
    let cellSize;

    // UI Elements
    const usernameDisplay = document.getElementById('username-display');
    const rankPointsDisplay = document.getElementById('rank-points-display');
    const rankNameDisplay = document.getElementById('rank-name-display');
    const usernameInput = document.getElementById('username-input');
    const setUsernameBtn = document.getElementById('set-username-btn');
    const startSoloBtn = document.getElementById('start-solo-btn');
    const joinRankedBtn = document.getElementById('join-ranked-btn');
    const joinBrBtn = document.getElementById('join-br-btn'); // New BR button
    const cancelRankedBtn = document.getElementById('cancel-ranked-btn');
    const cancelBrBtn = document.getElementById('cancel-br-btn'); // New Cancel BR button
    const gameMessage = document.getElementById('game-message');
    const opponentInfoDiv = document.getElementById('opponent-info');
    const opponentUsernameSpan = document.getElementById('opponent-username');
    const rankedLeaderboardTableBody = document.querySelector('#ranked-leaderboard-table tbody');
    const soloLeaderboardTableBody = document.querySelector('#solo-leaderboard-table tbody');
    const refreshLeaderboardBtn = document.getElementById('refresh-leaderboard-btn');
    const onlinePlayersCountDisplay = document.getElementById('online-players-count');

    // BR Lobby Info Elements
    const brLobbyInfo = document.getElementById('br-lobby-info');
    const brPlayersInLobby = document.getElementById('br-players-in-lobby');
    const brMaxPlayers = document.getElementById('br-max-players');
    const brCountdown = document.getElementById('br-countdown');

    // Modal Elements
    const messageModal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Device Selection Modal Elements
    const deviceSelectionModal = document.getElementById('device-selection-modal');
    const selectDesktopBtn = document.getElementById('select-desktop-btn');
    const selectMobileBtn = document.getElementById('select-mobile-btn');
    const touchControls = document.getElementById('touch-controls');
    const touchUpBtn = document.getElementById('touch-up');
    const touchDownBtn = document.getElementById('touch-down');
    const touchLeftBtn = document.getElementById('touch-left');
    const touchRightBtn = document.getElementById('touch-right');

    // Auth UI Elements
    const authSection = document.getElementById('auth-section');
    const mainGameContent = document.getElementById('main-game-content');
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const registerForm = document.getElementById('register-form');
    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');

    // Game State Variables
    let myUsername = 'Anonyme';
    let myRankPoints = 0;
    let myRankName = 'Bronze V'; // Default initial rank
    let currentUserId = null;
    let isLoggedIn = false;

    let gameInterval; // For solo mode
    let isRankedGame = false; // True for 1v1 ranked
    let isBRGame = false; // True for Battle Royale
    let currentRoomId = null;
    let player1Sid = null; // For 1v1
    let player2Sid = null; // For 1v1
    let mySid = null;

    // Game state (client-side for solo/1v1, synced from server for BR)
    let snake = []; // My snake (solo or 1v1)
    let opponentSnake = []; // Opponent snake (1v1)
    let food = {}; // Single food (solo/1v1)

    // BR specific client-side state
    let brGamePlayers = {}; // {sid: {username, snake, is_alive, apples_eaten}}
    let brGameFood = []; // Multiple food items
    let brZone = {min_x: 0, max_x: 0, min_y: 0, max_y: 0}; // Shrinking zone

    let direction = 'RIGHT'; // My snake's direction
    let changingDirection = false;
    let soloGameActive = false;
    let isMobileDevice = false;

    // --- Authentication and Player Info Functions (JSON-based) ---

    // This function needs to be smarter to parse the sub-tier
    function getRankName(points) {
        const ranks = {
                "Bronze I": 0,
                "Bronze II": 20,
                "Bronze III": 40,
                "Bronze IV": 60,
                "Bronze V": 80,
                "Argent I": 100,
                "Argent II": 130,
                "Argent III": 160,
                "Argent IV": 190,
                "Argent V": 220,
                "Or I": 250,
                "Or II": 290,
                "Or III": 330,
                "Or IV": 370,
                "Or V": 410,
                "Platine I": 450,
                "Platine II": 500,
                "Platine III": 550,
                "Platine IV": 600,
                "Platine V": 650,
                "Diamant I": 700,
                "Diamant II": 775,
                "Diamant III": 850,
                "Diamant IV": 925,
                "Diamant V": 1000,
                "Mythique I": 1100,
                "Mythique II": 1225,
                "Mythique III": 1375,
                "Mythique IV": 1500,
                "Mythique V": 1700,
                "Légendaire I": 2000,
                "Légendaire II": 2350,
                "Légendaire III": 2750,
                "Légendaire IV": 3200,
                "Légendaire V": 3700,
            };

        let currentRank = "Bronze I"; // Default lowest
        let sortedRanks = Object.entries(ranks).sort(([, a], [, b]) => a - b);

        for (const [rankName, threshold] of sortedRanks) {
            if (points >= threshold) {
                currentRank = rankName;
            } else {
                break;
            }
        }
        return currentRank;
    }

    function updateLoginState(loggedIn, username = 'Anonyme', userId = null, rankPoints = 0) {
        isLoggedIn = true; //TODO : remove login from this page
        currentUserId = userId;
        myUsername = username;
        myRankPoints = rankPoints;
        myRankName = getRankName(rankPoints);

        usernameDisplay.textContent = myUsername;
        rankPointsDisplay.textContent = myRankPoints;
        rankNameDisplay.textContent = myRankName;
        usernameInput.value = myUsername; // Keep username input synced

        console.log(`[updateLoginState] isLoggedIn: ${isLoggedIn}, Username: ${myUsername}, UserID: ${currentUserId}, RankPoints: ${myRankPoints}`);

        if (isLoggedIn) {
            authSection.classList.add('hidden');
            mainGameContent.classList.remove('hidden');
            console.log('UI: Logged in. Hiding auth, showing main game content.');
            socket.emit('request_leaderboards'); // Request initial leaderboard data after successful login
        } else {
            authSection.classList.remove('hidden');
            mainGameContent.classList.add('hidden');
            loginForm.classList.remove('hidden'); // Show login form by default on logout
            registerForm.classList.add('hidden');
            console.log('UI: Logged out. Hiding main game, showing auth section.');
        }
        hideAllGameModeButtons(); // Reset buttons visibility
        if (isLoggedIn) {
            startSoloBtn.classList.remove('hidden');
            joinRankedBtn.classList.remove('hidden');
            joinBrBtn.classList.remove('hidden');
        }
    }

    function hideAllGameModeButtons() {
        startSoloBtn.classList.add('hidden');
        joinRankedBtn.classList.add('hidden');
        joinBrBtn.classList.add('hidden');
        cancelRankedBtn.classList.add('hidden');
        cancelBrBtn.classList.add('hidden');
        opponentInfoDiv.classList.add('hidden'); // Hide opponent info for 1v1
        brLobbyInfo.classList.add('hidden'); // Hide BR lobby info
    }


    // --- Game Drawing and Logic Functions ---
    function updateCanvasSize() {
        let boardSizeToUse = currentBoardSize; // Use dynamic board size

        const maxCanvasSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.7, 500);
        canvas.width = maxCanvasSize;
        canvas.height = maxCanvasSize;
        cellSize = canvas.width / boardSizeToUse;
        drawGame();
    }

    function drawCellRounded(x, y, color) {
        const radius = cellSize * 0.2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x * cellSize + radius, y * cellSize);
        ctx.lineTo(x * cellSize + cellSize - radius, y * cellSize);
        ctx.quadraticCurveTo(x * cellSize + cellSize, y * cellSize, x * cellSize + cellSize, y * cellSize + radius);
        ctx.lineTo(x * cellSize + cellSize, y * cellSize + cellSize - radius);
        ctx.quadraticCurveTo(x * cellSize + cellSize, y * cellSize + cellSize, x * cellSize + cellSize - radius, y * cellSize + cellSize);
        ctx.lineTo(x * cellSize + radius, y * cellSize + cellSize);
        ctx.quadraticCurveTo(x * cellSize, y * cellSize + cellSize, x * cellSize, y * cellSize + cellSize - radius);
        ctx.lineTo(x * cellSize, y * cellSize + radius);
        ctx.quadraticCurveTo(x * cellSize, y * cellSize, x * cellSize + radius, y * cellSize);
        ctx.closePath();
        ctx.fill();
    }

    function drawSnake(snakeBody, snakeColor, isMySnake) {
        if (snakeBody.length === 0) return;
        for (let i = 1; i < snakeBody.length; i++) {
            drawCellRounded(snakeBody[i][0], snakeBody[i][1], snakeColor);
        }
        const head = snakeBody[0];
        ctx.fillStyle = isMySnake ? '#00e676' : '#ff9800'; // Green for my snake, orange for others
        drawCellRounded(head[0], head[1], ctx.fillStyle);

        const eyeRadius = cellSize * 0.08;
        let eye1X, eye1Y, eye2X, eye2Y;
        let currentHeadDirection;
        // Determine head direction based on the first two segments, or current direction if only one segment (initial)
        if (snakeBody.length > 1) {
            const dx = snakeBody[0][0] - snakeBody[1][0];
            const dy = snakeBody[0][1] - snakeBody[1][1];
            if (dx > 0) currentHeadDirection = 'RIGHT';
            else if (dx < 0) currentHeadDirection = 'LEFT';
            else if (dy > 0) currentHeadDirection = 'DOWN';
            else if (dy < 0) currentHeadDirection = 'UP';
            else currentHeadDirection = direction; // Fallback, should not happen normally
        } else {
             currentHeadDirection = direction; // Use the last known direction for single-segment snake
        }

        // Position eyes based on head direction
        if (currentHeadDirection === 'UP') {
            eye1X = head[0] * cellSize + cellSize * 0.25; eye1Y = head[1] * cellSize + cellSize * 0.25;
            eye2X = head[0] * cellSize + cellSize * 0.75; eye2Y = head[1] * cellSize + cellSize * 0.25;
        } else if (currentHeadDirection === 'DOWN') {
            eye1X = head[0] * cellSize + cellSize * 0.25; eye1Y = head[1] * cellSize + cellSize * 0.75;
            eye2X = head[0] * cellSize + cellSize * 0.75; eye2Y = head[1] * cellSize + cellSize * 0.75;
        } else if (currentHeadDirection === 'LEFT') {
            eye1X = head[0] * cellSize + cellSize * 0.25; eye1Y = head[1] * cellSize + cellSize * 0.25;
            eye2X = head[0] * cellSize + cellSize * 0.25; eye2Y = head[1] * cellSize + cellSize * 0.75;
        } else if (currentHeadDirection === 'RIGHT') {
            eye1X = head[0] * cellSize + cellSize * 0.75; eye1Y = head[1] * cellSize + cellSize * 0.25;
            eye2X = head[0] * cellSize + cellSize * 0.75; eye2Y = head[1] * cellSize + cellSize * 0.75;
        }
        ctx.fillStyle = '#1a202c'; // Eye color
        ctx.beginPath(); ctx.arc(eye1X, eye1Y, eyeRadius, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(eye2X, eye2Y, eyeRadius, 0, 2 * Math.PI); ctx.fill();
    }

    function drawFood(foodPos) {
        if (foodPos) {
            const x = foodPos[0] * cellSize + cellSize / 2;
            const y = foodPos[1] * cellSize + cellSize / 2;
            const r = cellSize * 0.4;
            ctx.fillStyle = '#ff3b30'; // Apple red
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Highlight
            ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.4, r * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#8B4513'; // Stem brown
            ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.1, y - r * 1.5); ctx.lineTo(x - r * 0.1, y - r * 1.5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#6ab04c'; // Leaf green
            ctx.beginPath(); ctx.ellipse(x + r * 0.4, y - r * 0.8, r * 0.3, r * 0.15, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#3b4556'; // Grid color
        ctx.lineWidth = 0.5;
        for (let i = 0; i < currentBoardSize; i++) {
            for (let j = 0; j < currentBoardSize; j++) {
                ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }
    }

    function drawGame() {
        clearCanvas();

        if (isBRGame) {
            // Draw BR zone
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'; // Light red transparent for safe zone outside
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Darker red for border
            ctx.lineWidth = 3;

            // Draw the area *outside* the safe zone with a semi-transparent red overlay
            // Top part
            ctx.fillRect(0, 0, canvas.width, brZone.min_y * cellSize);
            // Bottom part
            ctx.fillRect(0, brZone.max_y * cellSize, canvas.width, (currentBoardSize - brZone.max_y) * cellSize);
            // Left part (excluding top/bottom covered)
            ctx.fillRect(0, brZone.min_y * cellSize, brZone.min_x * cellSize, (brZone.max_y - brZone.min_y) * cellSize);
            // Right part (excluding top/bottom covered)
            ctx.fillRect(brZone.max_x * cellSize, brZone.min_y * cellSize, (currentBoardSize - brZone.max_x) * cellSize, (brZone.max_y - brZone.min_y) * cellSize);

            // Draw the active zone border
            ctx.beginPath();
            ctx.rect(brZone.min_x * cellSize, brZone.min_y * cellSize, (brZone.max_x - brZone.min_x) * cellSize, (brZone.max_y - brZone.min_y) * cellSize);
            ctx.stroke();

            // Draw multiple food items for BR
            brGameFood.forEach(f => drawFood(f));

            // Draw all players' snakes for BR
            for (const sid in brGamePlayers) {
                const playerData = brGamePlayers[sid];
                if (playerData.is_alive && playerData.snake && playerData.snake.length > 0) {
                    drawSnake(playerData.snake, (sid === mySid) ? '#10b981' : '#f97316', sid === mySid);
                }
            }
        } else { // Solo or Ranked 1v1
            drawFood(food);
            drawSnake(snake, '#10b981', true);
            if (isRankedGame && opponentSnake.length > 0) {
                drawSnake(opponentSnake, '#f97316', false);
            }
        }
    }

    function resetAllGameStates() {
        console.log('[resetAllGameStates] Resetting all game states.');
        clearInterval(gameInterval);
        soloGameActive = false;
        isRankedGame = false;
        isBRGame = false;
        currentRoomId = null;
        player1Sid = null;
        player2Sid = null;
        snake = [];
        opponentSnake = [];
        food = {};
        brGamePlayers = {};
        brGameFood = [];
        brZone = {min_x: 0, max_x: 0, min_y: 0, max_y: 0};
        direction = 'RIGHT';
        changingDirection = false;
        gameMessage.textContent = '';
        hideAllGameModeButtons();
        if (isLoggedIn) { // Only show game buttons if logged in
            startSoloBtn.classList.remove('hidden');
            joinRankedBtn.classList.remove('hidden');
            joinBrBtn.classList.remove('hidden');
        }
        // Reset board size to default for solo/ranked
        currentBoardSize = 20;
        updateCanvasSize();
    }


    function startSoloGame() {
        console.log('[startSoloGame] Button clicked. isLoggedIn:', isLoggedIn);
        if (!isLoggedIn) {
            showModal('Connexion requise', 'Veuillez vous connecter ou créer un compte pour jouer en mode solo.');
            console.log('[startSoloGame] Not logged in, preventing game start.');
            return;
        }
        resetAllGameStates(); // Reset all game states first
        soloGameActive = true;
        gameMessage.textContent = 'Mode Solo - Bonne chance !';
        socket.emit('start_solo_game');
    }

    function setSnakeDirection(newDirection) {
        // Prevent changing direction immediately after a move or making a 180-degree turn
        if (changingDirection) return;

        // Only allow change if not going directly opposite
        const goingUp = direction === 'UP';
        const goingDown = direction === 'DOWN';
        const goingLeft = direction === 'LEFT';
        const goingRight = direction === 'RIGHT';

        let validMove = false;
        if (newDirection === 'LEFT' && !goingRight) { direction = 'LEFT'; validMove = true; }
        else if (newDirection === 'UP' && !goingDown) { direction = 'UP'; validMove = true; }
        else if (newDirection === 'RIGHT' && !goingLeft) { direction = 'RIGHT'; validMove = true; }
        else if (newDirection === 'DOWN' && !goingUp) { direction = 'DOWN'; validMove = true; }

        if (validMove) {
            changingDirection = true;
            // Emit move to server for ranked or BR games
            if ((isRankedGame || isBRGame || soloGameActive) && currentRoomId) {
                socket.emit('player_move', { direction: direction });
            }
        }
    }

    document.addEventListener('keydown', e => {
        if (!soloGameActive && !isRankedGame && !isBRGame) return; // Only process keydown if a game is active

        const keyPressed = e.key;
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        const zqsdKeys = ['z', 'q', 's', 'd', 'Z', 'Q', 'S', 'D'];
        if (arrowKeys.includes(keyPressed) || zqsdKeys.includes(keyPressed)) {
            e.preventDefault(); // Prevent default browser scroll
            if (keyPressed.startsWith('Arrow')) {
                setSnakeDirection(keyPressed.substring(5).toUpperCase());
            } else {
                switch(keyPressed.toLowerCase()) {
                    case 'q': setSnakeDirection('LEFT'); break;
                    case 'z': setSnakeDirection('UP'); break;
                    case 'd': setSnakeDirection('RIGHT'); break;
                    case 's': setSnakeDirection('DOWN'); break;
                }
            }
        }
    });

    touchUpBtn.addEventListener('click', () => setSnakeDirection('UP'));
    touchDownBtn.addEventListener('click', () => setSnakeDirection('DOWN'));
    touchLeftBtn.addEventListener('click', () => setSnakeDirection('LEFT'));
    touchRightBtn.addEventListener('click', () => setSnakeDirection('RIGHT'));


    // --- Socket.IO Event Handlers ---
    socket.on('connect', () => {
        mySid = socket.id;
        console.log('[Socket.IO] Connecté au serveur Socket.IO:', mySid);
        gameMessage.textContent = 'Connecté au serveur. Prêt à jouer !';
        socket.emit('request_leaderboards'); // Request leaderboards on connect for initial display
        if (isLoggedIn) { // Restore buttons if already logged in (e.g., after reconnect)
            updateLoginState(isLoggedIn, myUsername, currentUserId, myRankPoints);
        }
    });

    socket.on('disconnect', () => {
        console.log('[Socket.IO] Déconnecté du serveur Socket.IO');
        gameMessage.textContent = 'Déconnecté du serveur. Veuillez rafraîchir.';
        resetAllGameStates(); // Reset all game states on disconnect
        updateLoginState(false); // Force logout state on server disconnect
    });

    socket.on('player_info', (data) => {
        // This is received from server after rank point adjustments
        // Update client's displayed info directly
        usernameDisplay.textContent = data.username;
        rankPointsDisplay.textContent = data.rank_points;
        rankNameDisplay.textContent = data.rank_name;
        // Also update the local variables that hold the player's current data
        myUsername = data.username;
        myRankPoints = data.rank_points;
        myRankName = data.rank_name;
        usernameInput.value = myUsername; // Keep username input synced
        console.log(`[player_info] Client player info updated: Username=${myUsername}, RankPoints=${myRankPoints}, RankName=${myRankName}`);
    });

    socket.on('online_players_count', (data) => {
        onlinePlayersCountDisplay.textContent = data.count;
        console.log(`[online_players_count] Joueurs en ligne: ${data.count}`);
    });

    socket.on('message', (data) => {
        gameMessage.textContent = data.text;
        console.log(`[Message du serveur] ${data.text}`);
        // Button visibility based on message for ranked queue
        if (data.text === 'Recherche d\'adversaire...') {
            hideAllGameModeButtons();
            cancelRankedBtn.classList.remove('hidden');
        } else if (data.text === 'Recherche Battle Royale...') {
            hideAllGameModeButtons();
            cancelBrBtn.classList.remove('hidden');
        } else if (data.text === 'Recherche annulée.' || data.text === 'Vous n\'êtes pas en file d\'attente classée.' || data.text === 'Vous n\'êtes pas en file d\'attente Battle Royale.') {
            // If a queue is cancelled or player is not in queue, show main buttons if logged in
            if (isLoggedIn) {
                startSoloBtn.classList.remove('hidden');
                joinRankedBtn.classList.remove('hidden');
                joinBrBtn.classList.remove('hidden');
            }
            cancelRankedBtn.classList.add('hidden');
            cancelBrBtn.classList.add('hidden');
        }
    });

    // --- Solo Game Specific Events ---
    socket.on('solo_game_start', (data) => {
        console.log('[solo_game_start] Solo game started event received:', data);
        resetAllGameStates(); // Ensure all states are clean
        soloGameActive = true;
        currentRoomId = data.room_id;
        currentBoardSize = data.board_size; // Set board size for solo
        updateCanvasSize();
        snake = data.initial_state.snake; //[[10, 10], [9, 10], [8, 10]];
        food = data.initial_state.food;
        direction = 'RIGHT'; // Default direction for solo
        changingDirection = false;
        drawGame();
        hideAllGameModeButtons(); // Hide all, then show only relevant for solo
        startSoloBtn.classList.add('hidden'); // Solo game is active, hide its start button
        console.log('[solo_game_start] Solo game started.');
        gameMessage.textContent = "Partie solo commencée !";
    });

    socket.on('solo_game_update', (data) => {
        if (soloGameActive && currentRoomId) {
            snake = data.snake;
            food = data.food;
            drawGame();
            changingDirection = false;
        }
    });

    socket.on('solo_game_over', (data) => {
        console.log('[solo_game_over] Received solo game_over event:', data);
        soloGameActive = false;
        gameMessage.textContent = data.message;
        showModal('Partie Solo Terminée', `${data.message} Votre score est de: ${data.score}`);
        setTimeout(() => {
            resetAllGameStates(); // Reset all after solo game
        }, 500);
    })

    // --- Ranked 1v1 specific events ---
    socket.on('game_start', (data) => {
        console.log('[game_start] Ranked 1v1 game started event received:', data);
        resetAllGameStates(); // Ensure all states are clean
        isRankedGame = true;
        currentRoomId = data.room_id;
        player1Sid = data.player1_sid;
        player2Sid = data.player2_sid;
        currentBoardSize = data.board_size; // Set board size for this game type
        updateCanvasSize();

        if (mySid === player1Sid) {
            snake = data.initial_state.player1_snake;
            opponentSnake = data.initial_state.player2_snake;
            direction = 'RIGHT'; // Player 1 starts right
        } else {
            snake = data.initial_state.player2_snake;
            opponentSnake = data.initial_state.player1_snake;
            direction = 'LEFT'; // Player 2 starts left
        }
        food = data.initial_state.food;
        changingDirection = false;

        gameMessage.textContent = `Partie classée commencée ! Adversaire: ${mySid === player1Sid ? data.player2_username : data.player1_username}`;
        opponentUsernameSpan.textContent = mySid === player1Sid ? data.player2_username : data.player1_username;
        opponentInfoDiv.classList.remove('hidden');
        hideAllGameModeButtons(); // Hide all game mode buttons

        drawGame();
    });

    socket.on('game_update', (data) => {
        if (isRankedGame && currentRoomId) {
            if (mySid === player1Sid) {
                snake = data.player1_snake;
                opponentSnake = data.player2_snake;
            } else {
                snake = data.player2_snake;
                opponentSnake = data.player1_snake;
            }
            food = data.food;
            drawGame();
            changingDirection = false;
        }
    });

    socket.on('game_over', async (data) => {
        console.log('[game_over] Received game_over event (Ranked 1v1):', data);

        if (!isRankedGame && !soloGameActive) {
            console.warn('[game_over] Game over received but no 1v1 or solo game was active. Ignoring.');
            return;
        }

        let message = '';
        let title = 'Partie Terminée';

        modalTitle.classList.remove('text-green-400', 'text-yellow-400', 'text-red-400');

        if (data.winner_sid === mySid) {
            message = `Félicitations ! Vous avez gagné la partie classée contre ${opponentUsernameSpan.textContent || 'votre adversaire'} !`;
            title = 'VICTOIRE !';
            modalTitle.classList.add('text-green-400');
        } else if (data.winner_sid === null && data.reason === 'double_elimination') {
            message = `Match Nul ! Les deux serpents ont été éliminés.`;
            title = 'ÉGALITÉ !';
            modalTitle.classList.add('text-yellow-400');
        } else if (data.reason === 'disconnected_game_end') {
            message = `La partie classée a été interrompue suite à une déconnexion de l'adversaire. Aucun point n'est ajusté.`;
            title = 'PARTIE INTERROMPUE !';
            modalTitle.classList.add('text-yellow-400');
        } else {
            message = `Dommage ! Vous avez perdu la partie classée contre ${opponentUsernameSpan.textContent || 'votre adversaire'}.`;
            title = 'DÉFAITE !';
            modalTitle.classList.add('text-red-400');
        }

        gameMessage.textContent = message;
        showModal(title, message);

        setTimeout(() => {
            resetAllGameStates(); // Reset all states after 1v1 game
        }, 1000);
    });

    // --- Battle Royale specific events ---
    socket.on('br_lobby_update', (data) => {
        brPlayersInLobby.textContent = data.players_in_lobby;
        brMaxPlayers.textContent = data.max_players;
        brLobbyInfo.classList.remove('hidden');
        gameMessage.textContent = `En attente de joueurs... (${data.players_in_lobby}/${data.max_players})`;
        console.log(`[BR Lobby] Joueurs dans le lobby: ${data.players_in_lobby}`);
    });

    socket.on('br_game_countdown', (data) => {
        if (data.status === 'started' || data.status === 'counting') {
            brLobbyInfo.classList.remove('hidden');
            brCountdown.textContent = data.time_left;
            brPlayersInLobby.textContent = data.players_in_lobby;
            gameMessage.textContent = `Le Battle Royale commence dans ${data.time_left} secondes ! (${data.players_in_lobby} joueurs)`;
            hideAllGameModeButtons();
            cancelBrBtn.classList.remove('hidden'); // Show cancel button during countdown
        } else if (data.status === 'cancelled_low_players') {
            brLobbyInfo.classList.add('hidden');
            gameMessage.textContent = 'Compte à rebours BR annulé : pas assez de joueurs.';
            if (isLoggedIn) {
                startSoloBtn.classList.remove('hidden');
                joinRankedBtn.classList.remove('hidden');
                joinBrBtn.classList.remove('hidden');
            }
            cancelBrBtn.classList.add('hidden');
        }
        console.log(`[BR Countdown] Temps restant: ${data.time_left}, Joueurs: ${data.players_in_lobby}`);
    });

    socket.on('br_game_start', (data) => {
        console.log('[br_game_start] Battle Royale game started event received:', data);
        resetAllGameStates(); // Clean all states
        isBRGame = true;
        currentRoomId = data.room_id;
        currentBoardSize = data.board_size; // Set BR board size
        updateCanvasSize(); // Apply new board size to canvas

        brGamePlayers = data.initial_state.players;
        brGameFood = data.initial_state.food_positions;
        brZone = {
            min_x: data.initial_state.zone_min_x,
            max_x: data.initial_state.zone_max_x,
            min_y: data.initial_state.zone_min_y,
            max_y: data.initial_state.zone_max_y
        };

        gameMessage.textContent = 'Battle Royale : Que le meilleur gagne !';
        brLobbyInfo.classList.add('hidden'); // Hide lobby info
        hideAllGameModeButtons(); // Hide all buttons once game starts

        // Set my snake's initial direction for display based on backend's initial state
        if (brGamePlayers[mySid] && brGamePlayers[mySid].snake.length > 1) {
            const head = brGamePlayers[mySid].snake[0];
            const neck = brGamePlayers[mySid].snake[1];
            if (head[0] > neck[0]) direction = 'RIGHT';
            else if (head[0] < neck[0]) direction = 'LEFT';
            else if (head[1] > neck[1]) direction = 'DOWN';
            else if (head[1] < neck[1]) direction = 'UP';
        } else if (brGamePlayers[mySid]) { // If only head, use default 'RIGHT' or specific initial
            direction = brGamePlayers[mySid].direction || 'RIGHT';
        }


        drawGame();
    });

    socket.on('br_game_update', (data) => {
        if (isBRGame && currentRoomId) {
            brGamePlayers = data.players;
            brGameFood = data.food_positions;
            brZone = {
                min_x: data.zone_min_x,
                max_x: data.zone_max_x,
                min_y: data.zone_min_y,
                max_y: data.zone_max_y
            };
            drawGame();
            changingDirection = false; // Reset changingDirection for next input
        }
    });

    socket.on('br_player_eliminated', (data) => {
        console.log(`[BR Elimination] Joueur éliminé: ${data.username} (${data.reason}).`);
        if (data.sid === mySid) {
            gameMessage.textContent = `Vous avez été éliminé(e) ! Raison: ${data.reason === 'zone' ? 'hors zone' : (data.reason === 'self_collision' ? 'collision avec vous-même' : (data.reason === 'opponent_collision' ? 'collision avec un adversaire' : (data.reason === 'head_to_head' ? 'collision frontale' : 'déconnexion')))}. Pommes mangées: ${data.apples_eaten}. Ordre d'élimination: ${data.elimination_order}`;
            // Keep game running for others, but show "eliminated" state for self
            socket.emit('request_leaderboards'); // Refresh leaderboards to see point change
        } else {
            gameMessage.textContent = `${data.username} a été éliminé(e) ! (${data.apples_eaten} pommes)`;
        }
        // Update local brGamePlayers state to mark player as not alive
        if (brGamePlayers[data.sid]) {
            brGamePlayers[data.sid].is_alive = false;
        }
        drawGame(); // Redraw game to show player removed
    });


    socket.on('br_game_over', async (data) => {
        console.log('[br_game_over] Received Battle Royale game_over event:', data);

        let message = '';
        let title = 'Battle Royale Terminée !';
        modalTitle.classList.remove('text-green-400', 'text-yellow-400', 'text-red-400');

        if (data.winner_sid === mySid) {
            message = `Félicitations ! Vous êtes le DERNIER SURVIVANT de la Battle Royale !`;
            title = 'VICTOIRE ROYALE !';
            modalTitle.classList.add('text-green-400');
        } else if (data.winner_sid && brGamePlayers[data.winner_sid]) {
            message = `Le gagnant est ${brGamePlayers[data.winner_sid].username} ! Dommage pour cette fois.`;
            title = 'PARTIE TERMINÉE !';
            modalTitle.classList.add('text-red-400');
        } else if (data.reason === 'no_survivor') {
            message = `Aucun survivant ! La zone a tout englouti ou tout le monde est mort simultanément.`;
            title = 'Match Nul BR !';
            modalTitle.classList.add('text-yellow-400');
        } else { // Generic or disconnected_game_end (already handled by main disconnect, but for safety)
            message = `La partie Battle Royale a été interrompue.`;
            title = 'PARTIE INTERROMPUE !';
            modalTitle.classList.add('text-yellow-400');
        }

        gameMessage.textContent = message;
        showModal(title, message);

        setTimeout(() => {
            resetAllGameStates(); // Reset all states after BR game
        }, 1000);
    });


    socket.on('auth_response', (data) => {
        console.log('[auth_response] Received auth_response:', data);
        if (data.success) {
            showModal('Succès', data.message);
            if (data.user_id) {
                // Update the local state with the received user data
                updateLoginState(true, data.username, data.user_id, data.rank_points);
            } else { // Logout success
                updateLoginState(false);
            }
        } else {
            showModal('Erreur', data.message);
            console.error('[auth_response] Auth failed:', data.message);
        }
    });

    /*socket.on('solo_score_response', (data) => {
        if (data.success) {
            console.log('[solo_score_response]', data.message);
        } else {
            console.error('[solo_score_response]', data.message);
        }
    });*/

    socket.on('leaderboard_data', (data) => {
        console.log('[leaderboard_data] Received leaderboard data:', data);
        displayRankedLeaderboard(data.ranked);
        displaySoloLeaderboard(data.solo);
    });

    socket.on('refresh_leaderboards', () => {
        console.log('[refresh_leaderboards] Server requested leaderboard refresh.');
        socket.emit('request_leaderboards');
    });


    // --- UI Event Listeners ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        console.log('[UI] Showing register form.');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        console.log('[UI] Showing login form.');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();
        console.log(`[UI] Login attempt for username: ${username}`);
        socket.emit('login_user', { username: username, password: password });
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = registerUsernameInput.value.trim();
        const password = registerPasswordInput.value.trim();

        if (!username || !password) {
            showModal('Erreur d\'inscription', 'Veuillez entrer un nom d\'utilisateur et un mot de passe.');
            console.log('[UI] Register attempt failed: missing username/password.');
            return;
        }
        console.log(`[UI] Register attempt for username: ${username}`);
        socket.emit('register_user', { username: username, password: password });
    });

    logoutBtn.addEventListener('click', () => {
        console.log('[UI] Logout button clicked.');
        location.href = '/logout'
    });

    setUsernameBtn.addEventListener('click', () => {
        console.log('[UI] Set Username button clicked. isLoggedIn:', isLoggedIn);
        if (!isLoggedIn) {
            showModal('Erreur', 'Veuillez vous connecter pour définir votre nom.');
            return;
        }
        const newUsername = usernameInput.value.trim();
        if (newUsername) {
            console.log(`[UI] Emitting set_username_json with new username: ${newUsername}`);
            socket.emit('set_username_json', { username: newUsername });
        } else {
            showModal('Erreur', 'Le nom d\'utilisateur ne peut pas être vide.');
        }
    });

    startSoloBtn.addEventListener('click', () => {
        startSoloGame(); // Direct call to the function, which has the isLoggedIn check
    });

    joinRankedBtn.addEventListener('click', () => {
        console.log('[UI] Join Ranked button clicked. isLoggedIn:', isLoggedIn);
        if (!isLoggedIn) {
            showModal('Connexion requise', 'Veuillez vous connecter ou créer un compte pour jouer en mode classé.');
            console.log('[UI] Not logged in, preventing ranked queue join.');
            return;
        }
        if (soloGameActive || isRankedGame || isBRGame || currentRoomId) {
            showModal('Attention', 'Vous êtes déjà dans une partie ou une file d\'attente. Terminez-la avant de rejoindre une partie classée.');
            console.log('[UI] Already in game or queue, preventing ranked queue join.');
            return;
        }
        console.log('[UI] Emitting join_ranked_queue.');
        socket.emit('join_ranked_queue'); // No data needed, server gets username from its connected_players dict
        hideAllGameModeButtons();
        cancelRankedBtn.classList.remove('hidden');
    });

    joinBrBtn.addEventListener('click', () => {
        console.log('[UI] Join BR button clicked. isLoggedIn:', isLoggedIn);
        if (!isLoggedIn) {
            showModal('Connexion requise', 'Veuillez vous connecter ou créer un compte pour jouer en mode Battle Royale.');
            console.log('[UI] Not logged in, preventing BR queue join.');
            return;
        }
        if (soloGameActive || isRankedGame || isBRGame || currentRoomId) {
            showModal('Attention', 'Vous êtes déjà dans une partie ou une file d\'attente. Terminez-la avant de rejoindre une partie Battle Royale.');
            console.log('[UI] Already in game or queue, preventing BR queue join.');
            return;
        }
        console.log('[UI] Emitting join_br_queue.');
        socket.emit('join_br_queue');
        hideAllGameModeButtons();
        cancelBrBtn.classList.remove('hidden');
    });


    cancelRankedBtn.addEventListener('click', () => {
        console.log('[UI] Cancel Ranked button clicked.');
        socket.emit('leave_ranked_queue');
        gameMessage.textContent = 'Recherche annulée.';
        resetAllGameStates(); // Reset buttons and states
        updateLoginState(isLoggedIn, myUsername, currentUserId, myRankPoints); // Show main buttons if logged in
    });

    cancelBrBtn.addEventListener('click', () => {
        console.log('[UI] Cancel BR button clicked.');
        socket.emit('leave_br_queue');
        gameMessage.textContent = 'Recherche Battle Royale annulée.';
        resetAllGameStates(); // Reset buttons and states
        updateLoginState(isLoggedIn, myUsername, currentUserId, myRankPoints); // Show main buttons if logged in
    });

    refreshLeaderboardBtn.addEventListener('click', () => {
        console.log('[UI] Refresh Leaderboard button clicked.');
        socket.emit('request_leaderboards');
    });

    // --- Leaderboard Display Functions ---
    function displayRankedLeaderboard(leaderboard) {
        rankedLeaderboardTableBody.innerHTML = '';
        if (leaderboard.length === 0) {
            rankedLeaderboardTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Aucune donnée de classement pour l\'instant.</td></tr>';
        } else {
            leaderboard.forEach((player, index) => {
                const row = rankedLeaderboardTableBody.insertRow();
                row.insertCell(0).textContent = index + 1;
                row.insertCell(1).textContent = player.username;
                row.insertCell(2).textContent = `${player.rank_points} (${player.rank_name})`;
            });
        }
    }

    function displaySoloLeaderboard(leaderboard) {
        soloLeaderboardTableBody.innerHTML = '';
        if (leaderboard.length === 0) {
            soloLeaderboardTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4">Aucun score solo pour l\'instant.</td></tr>';
        } else {
            leaderboard.forEach((player, index) => {
                const row = soloLeaderboardTableBody.insertRow();
                row.insertCell(0).textContent = index + 1;
                row.insertCell(1).textContent = player.username;
                row.insertCell(2).textContent = player.score;
            });
        }
    }

    // --- Modal Handling ---
    function showModal(title, message) {
        console.log(`[Modal] Showing modal: Title="${title}", Message="${message}"`);
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        messageModal.classList.add('active');
    }

    modalCloseBtn.addEventListener('click', () => {
        console.log('[Modal] Closing modal.');
        messageModal.classList.remove('active');
    });

    // --- Device Selection Logic ---
    function setDevicePreference(deviceType) {
        console.log('[Device Selection] Device preference set to:', deviceType);
        localStorage.setItem('snake_device_type', deviceType);
        isMobileDevice = (deviceType === 'mobile');

        deviceSelectionModal.classList.remove('active');
        console.log('[Device Selection] Device selection modal hidden.');
        applyDeviceSettings();

        // After device selection, show the auth section
        // Initially, consider user as logged out until login_user or register_user succeeds
        updateLoginState(false);
    }

    function applyDeviceSettings() {
        if (isMobileDevice) {
            touchControls.classList.remove('hidden');
            console.log('[Device Settings] Touch controls shown.');
        } else {
            touchControls.classList.add('hidden');
            console.log('[Device Settings] Touch controls hidden.');
        }
        updateCanvasSize();
    }

    selectDesktopBtn.addEventListener('click', () => setDevicePreference('desktop'));
    selectMobileBtn.addEventListener('click', () => setDevicePreference('mobile'));

    // --- Initialisation ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Init] DOM Content Loaded.');
        const savedDeviceType = localStorage.getItem('snake_device_type');
        if (savedDeviceType) {
            console.log('[Init] Saved device type found:', savedDeviceType);
            isMobileDevice = (savedDeviceType === 'mobile');
            deviceSelectionModal.classList.remove('active');
            applyDeviceSettings();
            // If a device preference is saved, automatically go to auth section.
            // The updateLoginState(false) call handles displaying the auth UI.
            updateLoginState(true);
        } else {
            console.log('[Init] No saved device type, showing device selection modal.');
            deviceSelectionModal.classList.remove('hidden')
            deviceSelectionModal.classList.add('active'); // Show device selection if no preference
        }
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    });


