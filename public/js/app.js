let selectedGame = 'tictactoe';
let roomsInterval = null;

// Selezione del minigioco
function selectGame(gameType, element) {
  if (!element || element.classList.contains('disabled')) return;

  document.querySelectorAll('.game-card').forEach(card => card.classList.remove('active'));
  element.classList.add('active');
  selectedGame = gameType;

  // Aggiorna visivamente lo stato dei pulsanti e ricarica le stanze
  toggleButtons();
  loadPublicRooms();
}

// Controllo e abilitazione dei pulsanti
function toggleButtons() {
  const usernameInput = document.getElementById('username-input');
  const joinCodeInput = document.getElementById('join-code');
  const btnCreate = document.getElementById('btn-create');
  const btnJoin = document.getElementById('btn-join');

  if (!usernameInput || !btnCreate || !btnJoin) return;

  const username = usernameInput.value.trim();
  const joinCode = joinCodeInput ? joinCodeInput.value.trim() : '';

  btnCreate.disabled = username.length === 0;
  btnJoin.disabled = username.length === 0 || joinCode.length < 4;
}

// Inizializzazione Event Listener e Auto-Update
document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('username-input');
  const joinInput = document.getElementById('join-code');

  if (usernameInput) usernameInput.addEventListener('input', toggleButtons);
  if (joinInput) joinInput.addEventListener('input', toggleButtons);

  toggleButtons();
  loadPublicRooms();

  // Aggiorna automaticamente la lista stanze ogni 3 secondi
  if (roomsInterval) clearInterval(roomsInterval);
  roomsInterval = setInterval(loadPublicRooms, 3000);
});

// Creazione Nuova Stanza
async function createRoom() {
  const usernameInput = document.getElementById('username-input');
  const username = usernameInput ? usernameInput.value.trim() : '';

  if (!username) return alert('Inserisci un nickname!');

  sessionStorage.setItem('username', username);

  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType: selectedGame })
    });

    const session = await res.json();
    if (res.ok && session.code) {
      window.location.href = `/${selectedGame}.html?code=${session.code}`;
    } else {
      alert(session.error || 'Errore durante la creazione della stanza');
    }
  } catch (err) {
    console.error('Errore creazione stanza:', err);
    alert('Impossibile connettersi al server');
  }
}

// Accesso Manuale tramite Codice
function joinRoom() {
  const usernameInput = document.getElementById('username-input');
  const joinInput = document.getElementById('join-code');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const code = joinInput ? joinInput.value.trim().toUpperCase() : '';

  if (!username) return alert('Inserisci un nickname!');
  if (!code) return alert('Inserisci il codice della stanza!');

  sessionStorage.setItem('username', username);
  window.location.href = `/${selectedGame}.html?code=${code}`;
}

// Caricamento Lista Stanze Pubbliche
async function loadPublicRooms() {
  const container = document.getElementById('rooms-list-container');
  if (!container) return;

  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error('Risposta server non valida');

    const rooms = await res.json();

    if (!Array.isArray(rooms) || rooms.length === 0) {
      container.innerHTML = `
        <div class="room-empty-state">
          Nessuna stanza disponibile al momento. Creane una tu!
        </div>`;
      return;
    }

    const gameNames = {
      tictactoe: '❌⭕ Tris',
      truthordare: '🔥🤔 Obbligo o Verità'
    };

    container.innerHTML = rooms.map(room => `
      <div class="room-card-item">
        <div class="room-details">
          <div class="room-title">
            Stanza di ${room.hostName || 'Giocatore'}
            <span class="room-code-tag">#${room.code}</span>
          </div>
          <div class="room-meta">
            <span>${gameNames[room.gameType] || room.gameType}</span>
            <span>•</span>
            <span>👥 ${room.playerCount} ${room.playerCount === 1 ? 'giocatore' : 'giocatori'}</span>
          </div>
        </div>
        <button class="btn btn-primary" style="padding: 10px 20px; font-size: 0.85rem;" onclick="joinRoomByCode('${room.code}', '${room.gameType}')">
          Entra
        </button>
      </div>
    `).join('');

  } catch (err) {
    console.error('Errore caricamento stanze:', err);
    container.innerHTML = `
      <div class="room-empty-state" style="color: var(--accent-pink);">
        Impossibile recuperare le stanze al momento.
      </div>`;
  }
}

// Accesso Diretto da Lista
function joinRoomByCode(code, gameType) {
  const usernameInput = document.getElementById('username-input');
  let username = usernameInput ? usernameInput.value.trim() : '';

  if (!username) {
    username = prompt('Inserisci il tuo Nickname per entrare:');
    if (!username || !username.trim()) return;
    username = username.trim();
    if (usernameInput) usernameInput.value = username;
  }

  const targetGame = gameType || selectedGame;
  sessionStorage.setItem('username', username);
  window.location.href = `/${targetGame}.html?code=${code}`;
}