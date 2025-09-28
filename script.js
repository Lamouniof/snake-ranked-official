// --- Socket.IO ---
const socket = io();
let isLoggedIn = false, mySid = null, myUsername = "", currentUserId = null, myRankPoints = 0;
const usernameDisplay = document.getElementById('username-display');
const rankPointsDisplay = document.getElementById('rank-points-display');
const rankNameDisplay = document.getElementById('rank-name-display');
const usernameInput = document.getElementById('username-input');
const setUsernameBtn = document.getElementById('set-username-btn');
const deviceModal = document.getElementById('device-selection-modal');
const authSection = document.getElementById('auth-section');
const mainGameContent = document.getElementById('main-game-content');
const logoutBtn = document.getElementById('logout-btn');
const startSoloBtn = document.getElementById('start-solo-btn');
const joinRankedBtn = document.getElementById('join-ranked-btn');
const joinBrBtn = document.getElementById('join-br-btn');
const gameMessage = document.getElementById('game-message');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- UI helpers ---
function showModal(title, msg) {
    modal.classList.remove('hidden');
    modalTitle.textContent = title;
    modalMessage.textContent = msg;
}
function hideModal() { modal.classList.add('hidden'); }
modalCloseBtn && modalCloseBtn.addEventListener('click', hideModal);

function updateLoginState(logged, username="", id=null, points=0) {
    isLoggedIn = logged;
    if (logged) {
        authSection.classList.add('hidden');
        mainGameContent.classList.remove('hidden');
        usernameDisplay.textContent = username;
        rankPointsDisplay.textContent = points;
        // Appelle une fonction pour calculer le rang à partir des points
        rankNameDisplay.textContent = getRankName(points);
        myUsername = username;
        currentUserId = id;
        myRankPoints = points;
    } else {
        authSection.classList.remove('hidden');
        mainGameContent.classList.add('hidden');
        usernameDisplay.textContent = "";
        rankPointsDisplay.textContent = "0";
        rankNameDisplay.textContent = "Bronze V";
        myUsername = ""; currentUserId = null; myRankPoints = 0;
    }
}
function getRankName(points) {
    if(points >= 2000) return "Platine";
    if(points >= 1500) return "Or";
    if(points >= 1000) return "Argent";
    return "Bronze V";
}

// --- Authentification logique ---
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if(!username || !password) return showModal("Erreur", "Remplissez tous les champs.");
    socket.emit('login', { username, password });
});
document.getElementById('register-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    if(!username || !password) return showModal("Erreur", "Remplissez tous les champs.");
    socket.emit('register', { username, password });
});
document.getElementById('show-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
});
document.getElementById('show-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

// --- Socket.IO Events ---
socket.on('connect', () => {
    mySid = socket.id;
    gameMessage && (gameMessage.textContent = "Connecté au serveur. Prêt à jouer !");
    socket.emit('request_leaderboards');
    if (isLoggedIn) updateLoginState(isLoggedIn, myUsername, currentUserId, myRankPoints);
});
socket.on('disconnect', () => {
    gameMessage && (gameMessage.textContent = "Déconnecté du serveur. Veuillez rafraîchir.");
    updateLoginState(false);
});
socket.on('auth_response', (data) => {
    if(data.success) {
        updateLoginState(true, data.username, data.user_id, data.rank_points);
        showModal("Succès", data.message || "Connecté(e) !");
    } else {
        showModal("Erreur", data.message || "Erreur d'authentification.");
    }
});
socket.on('register_response', (data) => {
    if(data.success) {
        updateLoginState(true, data.username, data.user_id, data.rank_points);
        showModal("Bienvenue", data.message || "Inscription réussie !");
    } else {
        showModal("Erreur", data.message || "Inscription échouée.");
    }
});
// Ajoute ici d'autres listeners pour les events de partie, leaderboard etc.

// --- Boutons principaux ---
logoutBtn && logoutBtn.addEventListener('click', () => { location.href = '/logout'; });
setUsernameBtn && setUsernameBtn.addEventListener('click', () => {
    if(!isLoggedIn) return showModal('Erreur', 'Veuillez vous connecter pour définir votre nom.');
    const newUsername = usernameInput.value.trim();
    if(newUsername) {
        socket.emit('set_username_json', { username: newUsername });
    } else {
        showModal('Erreur', "Le nom d'utilisateur ne peut pas être vide.");
    }
});
startSoloBtn && startSoloBtn.addEventListener('click', () => {
    if (!isLoggedIn) return showModal("Connexion requise", "Veuillez vous connecter pour jouer en mode solo.");
    socket.emit('start_solo_game');
});
joinRankedBtn && joinRankedBtn.addEventListener('click', () => {
    if (!isLoggedIn) return showModal("Connexion requise", "Veuillez vous connecter pour jouer en classé.");
    socket.emit('join_ranked_game');
});
joinBrBtn && joinBrBtn.addEventListener('click', () => {
    if (!isLoggedIn) return showModal("Connexion requise", "Veuillez vous connecter pour jouer au Battle Royale.");
    socket.emit('join_br_game');
});

// --- Sélection appareil ---
document.getElementById('select-desktop-btn')?.addEventListener('click', () => {
    deviceModal.classList.add('hidden');
});
document.getElementById('select-mobile-btn')?.addEventListener('click', () => {
    deviceModal.classList.add('hidden');
    document.getElementById('touch-controls').classList.remove('hidden');
});

// --- Affichage initial ---
window.addEventListener('DOMContentLoaded', () => {
    updateLoginState(false);
    deviceModal.classList.remove('hidden');
    authSection && authSection.classList.remove('hidden');
    mainGameContent && mainGameContent.classList.add('hidden');
});
