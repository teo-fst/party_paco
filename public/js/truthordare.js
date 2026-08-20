const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = urlParams.get('code');

let myPlayerId = sessionStorage.getItem(`playerId_${currentRoomCode}`);
const savedUsername = sessionStorage.getItem('username') || 'Giocatore';

let localSpinInterval = null;

if (!currentRoomCode) {
  window.location.href = '/';
} else {
  document.getElementById('display-room-code').innerText = currentRoomCode;
  joinAndStart();
}

async function joinAndStart() {
  try {
    const res = await fetch(`/api/sessions/${currentRoomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId, username: savedUsername })
    });
    
    const data = await res.json();
    if (data.player) {
      myPlayerId = data.player.id;
      sessionStorage.setItem(`playerId_${currentRoomCode}`, myPlayerId);
    }
  } catch (err) {
    console.error('Errore connessione:', err);
  }

  fetchRoomState();
  setInterval(fetchRoomState, 1000);
}

async function fetchRoomState() {
  try {
    const res = await fetch(`/api/sessions/${currentRoomCode}`);
    if (res.status === 404) return;
    const session = await res.json();
    updateUI(session);
  } catch (err) {
    console.error(err);
  }
}

function updateUI(session) {
  const players = session.players || {};
  const playerIds = Object.keys(players);
  const state = session.gameState;
  const isHost = session.hostId === myPlayerId;

  // Render lista giocatori
  const playersListContainer = document.getElementById('players-list');
  if (playersListContainer) {
    playersListContainer.innerHTML = playerIds.map(id => {
      const p = players[id];
      const isMe = id === myPlayerId;
      const isTarget = state && state.targetPlayerId === id;
      const isRoomHost = id === session.hostId;

      return `
        <div class="player-badge ${isTarget ? 'active-turn' : ''}">
          <span>${p.emoji || '🎮'}</span>
          <span>${p.username} ${isMe ? '(Tu)' : ''}</span>
          ${isRoomHost ? '<span title="Creatore Stanza">👑</span>' : ''}
        </div>
      `;
    }).join('');
  }

  // Gestione Lobby di Attesa
  if (session.status === 'WAITING' || !state || playerIds.length < 2) {
    document.getElementById('lobby-waiting').style.display = 'block';
    document.getElementById('roulette').style.display = 'none';
    document.getElementById('choice-banner').style.display = 'none';
    document.getElementById('phase-choosing').style.display = 'none';
    document.getElementById('phase-prompting').style.display = 'none';
    document.getElementById('phase-answering').style.display = 'none';

    document.getElementById('waiting-status-text').innerText = `In attesa dei giocatori... (${playerIds.length} presenti)`;

    const startBtn = document.getElementById('btn-start-game');
    if (isHost && playerIds.length >= 2) {
      startBtn.style.display = 'inline-flex';
    } else {
      startBtn.style.display = 'none';
    }
    return;
  }

  document.getElementById('lobby-waiting').style.display = 'none';
  document.getElementById('roulette').style.display = 'block';

  const targetPlayer = players[state.targetPlayerId];
  const askerPlayer = players[state.askerPlayerId];
  const isTarget = myPlayerId === state.targetPlayerId;
  const isAsker = myPlayerId === state.askerPlayerId;

  // Reset visibilità sezioni
  document.getElementById('phase-choosing').style.display = 'none';
  document.getElementById('phase-prompting').style.display = 'none';
  document.getElementById('phase-answering').style.display = 'none';
  document.getElementById('choice-banner').style.display = 'none';

  // Gestione animazione ruota
  if (state.phase === 'SPINNING') {
    startSpinAnimation(players);
    setTimeout(() => sendAction('STOP_SPINNER'), 2200);
  } else {
    clearInterval(localSpinInterval);
    localSpinInterval = null;
    document.getElementById('roulette').innerText = `🎯 Giocatore estratto: ${targetPlayer ? targetPlayer.username : '...'}`;
  }

  // Mostra Banner Scelta Effettuata se presente
  if (state.selectedType && state.phase !== 'SPINNING' && state.phase !== 'CHOOSING') {
    const banner = document.getElementById('choice-banner');
    const badgeText = document.getElementById('choice-badge-text');
    banner.style.display = 'block';
    const typeLabel = state.selectedType === 'truth' ? '🤔 VERITÀ' : '🔥 OBBLIGO';
    badgeText.innerText = `${targetPlayer ? targetPlayer.username : 'Giocatore'} ha scelto: ${typeLabel}`;
  }

  // Fasi di Gioco
  if (state.phase === 'CHOOSING') {
    if (isTarget) {
      document.getElementById('phase-choosing').style.display = 'block';
    } else {
      document.getElementById('roulette').innerText += ` (Sta scegliendo...)`;
    }
  } 
  else if (state.phase === 'PROMPTING') {
    if (isAsker) {
      document.getElementById('phase-prompting').style.display = 'block';
      renderCategories(state.selectedType);
    } else {
      document.getElementById('roulette').innerText += ` (${askerPlayer ? askerPlayer.username : 'L\'avversario'} sta preparando la sfida...)`;
    }
  } 
  else if (state.phase === 'ANSWERING') {
    document.getElementById('phase-answering').style.display = 'block';
    document.getElementById('display-prompt').innerText = `"${state.currentPrompt}"`;
    document.getElementById('btn-complete').style.display = isTarget ? 'inline-flex' : 'none';
  }
}

function renderCategories(selectedType) {
  const container = document.getElementById('preset-categories-container');
  if (!container) return;

  if (selectedType === 'truth') {
    container.innerHTML = `
      <button class="btn btn-secondary" onclick="getPreset('divertenti')">🤣 Divertenti</button>
      <button class="btn btn-secondary" onclick="getPreset('imbarazzanti')">😳 Imbarazzanti</button>
      <button class="btn btn-secondary" onclick="getPreset('segreti')">🤫 Segreti</button>
      <button class="btn btn-secondary" onclick="getPreset('scuola')">📚 Scuola</button>
      <button class="btn btn-secondary" onclick="getPreset('spicy')">🌶️ Cotte & Flirt</button>
      <button class="btn btn-secondary" onclick="getPreset('amicizia')">👥 Amicizia</button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-secondary" onclick="getPreset('divertenti')">🤣 Divertenti</button>
      <button class="btn btn-secondary" onclick="getPreset('fisiche')">🏃 Fisiche</button>
      <button class="btn btn-secondary" onclick="getPreset('sociali')">🗣️ Sociali</button>
      <button class="btn btn-secondary" onclick="getPreset('scuola')">📚 Scuola</button>
      <button class="btn btn-secondary" onclick="getPreset('spicy')">🌶️ Cotte & Flirt</button>
      <button class="btn btn-secondary" onclick="getPreset('pazze')">🤪 Pazze</button>
    `;
  }
}

function startSpinAnimation(players) {
  if (localSpinInterval) return;
  const names = Object.values(players).map(p => p.username);
  let idx = 0;
  
  localSpinInterval = setInterval(() => {
    document.getElementById('roulette').innerText = `🎰 Estrazione: ${names[idx % names.length]}`;
    idx++;
  }, 100);
}

async function startGame() {
  try {
    const res = await fetch(`/api/sessions/${currentRoomCode}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId })
    });
    const data = await res.json();
    if (data.success) fetchRoomState();
    else if (data.error) alert(data.error);
  } catch (err) {
    console.error('Errore avvio partita:', err);
  }
}

async function sendAction(action, extra = {}) {
  try {
    await fetch(`/api/sessions/${currentRoomCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId, payload: { action, ...extra } })
    });
    fetchRoomState();
  } catch (err) {
    console.error(err);
  }
}

function selectType(type) {
  sendAction('SELECT_TYPE', { type });
}

function submitCustomPrompt() {
  const input = document.getElementById('custom-prompt-input');
  if (!input || !input.value.trim()) return alert('Inserisci una sfida o domanda!');
  
  const promptText = input.value.trim();
  input.value = '';
  
  sendAction('SUBMIT_PROMPT', { prompt: promptText });
}

function getPreset(category) {
  sendAction('GET_PRESET', { category });
}

function completeTurn() {
  sendAction('COMPLETE_TURN');
}

// Gestione uscita volontaria o chiusura scheda
async function leaveRoom() {
  if (currentRoomCode && myPlayerId) {
    try {
      await fetch(`/api/sessions/${currentRoomCode}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
        keepalive: true
      });
    } catch (err) {
      console.error(err);
    }
  }
  window.location.href = '/';
}

window.addEventListener('beforeunload', () => {
  if (currentRoomCode && myPlayerId) {
    navigator.sendBeacon(
      `/api/sessions/${currentRoomCode}/leave`,
      JSON.stringify({ playerId: myPlayerId })
    );
  }
});