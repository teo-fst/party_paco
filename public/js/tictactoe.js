const urlParams = new URLSearchParams(window.location.search);
const currentRoomCode = urlParams.get('code');

let myPlayerId = sessionStorage.getItem(`playerId_${currentRoomCode}`);
const savedUsername = sessionStorage.getItem('username') || 'Giocatore';

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
      body: JSON.stringify({ 
        playerId: myPlayerId,
        username: savedUsername 
      })
    });
    
    const data = await res.json();
    if (data.player) {
      myPlayerId = data.player.id;
      sessionStorage.setItem(`playerId_${currentRoomCode}`, myPlayerId);
    }
  } catch (err) {
    console.error('Errore durante la connessione:', err);
  }

  fetchRoomState();
  setInterval(fetchRoomState, 1000);
}

async function fetchRoomState() {
  try {
    const res = await fetch(`/api/sessions/${currentRoomCode}`);
    if (res.status === 404) {
      document.getElementById('game-status').innerText = 'Stanza non trovata o scaduta.';
      return;
    }
    const session = await res.json();
    updateBoard(session);
  } catch (err) {
    console.error(err);
  }
}

function updateBoard(session) {
  const players = session.players || {};
  const playerIds = Object.keys(players);
  const playerCount = playerIds.length;
  const restartBtn = document.getElementById('restart-btn');

  // Identifica chi deve muovere (solo se la partita è in corso)
  const currentTurnId = (session.gameState && !session.gameState.finished) ? session.gameState.turn : null;

  // Rendering Giocatori: Illumina ESCLUSIVAMENTE chi deve fare la mossa
  const playersListContainer = document.getElementById('players-list');
  if (playersListContainer) {
    playersListContainer.innerHTML = playerIds.map(id => {
      const p = players[id];
      const isMe = id === myPlayerId;
      const isHost = id === session.hostId;
      const isTurn = currentTurnId === id;

      return `
        <div class="player-badge ${isTurn ? 'active-turn' : ''}">
          <span>${p.emoji || '🎮'}</span>
          <span>${p.username} ${isMe ? '(Tu)' : ''}</span>
          ${isHost ? '<span title="Creatore Stanza">👑</span>' : ''}
        </div>
      `;
    }).join('');
  }

  if (session.status === 'WAITING' || !session.gameState) {
    document.getElementById('game-status').innerText = `In attesa del secondo giocatore... (${playerCount}/2)`;
    if (restartBtn) restartBtn.style.display = 'none';
    return;
  }

  const board = session.gameState.board || Array(9).fill(null);
  const cells = document.querySelectorAll('.tictactoe-board .cell');
  
  cells.forEach((cell, idx) => {
    const val = board[idx];
    cell.innerText = val ? val : '';
    cell.className = 'cell ' + (val ? val.toLowerCase() : '');
  });

  if (session.gameState.finished) {
    // Il pulsante Rigioca apparirà SOLO per l'Host della stanza
    if (restartBtn) {
      restartBtn.style.display = (myPlayerId === session.hostId) ? 'inline-flex' : 'none';
    }

    if (session.gameState.winner) {
      const isWinner = session.gameState.winner === myPlayerId;
      document.getElementById('game-status').innerText = isWinner 
        ? '🏆 Hai vinto!' 
        : '❌ Hai perso!';
    } else {
      document.getElementById('game-status').innerText = '🤝 Partita terminata in pareggio!';
    }
  } else {
    if (restartBtn) restartBtn.style.display = 'none';

    const isMyTurn = session.gameState.turn === myPlayerId;
    const mySymbol = session.gameState.symbols ? session.gameState.symbols[myPlayerId] : '';
    
    const opponentId = playerIds.find(id => id !== myPlayerId);
    const opponentName = opponentId && players[opponentId] ? players[opponentId].username : 'Avversario';

    document.getElementById('game-status').innerText = isMyTurn 
      ? `⚡ È il TUO turno! (${mySymbol})` 
      : `⏳ È il turno di ${opponentName}...`;
  }
}

async function makeMove(index) {
  if (!currentRoomCode || !myPlayerId) return;

  try {
    const res = await fetch(`/api/sessions/${currentRoomCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        playerId: myPlayerId, 
        payload: { index } 
      })
    });

    const result = await res.json();
    if (result.success) {
      fetchRoomState();
    }
  } catch (err) {
    console.error('Errore invio mossa:', err);
  }
}

// Funzione per riavviare la partita
async function restartGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const playerId = localStorage.getItem('playerId') || sessionStorage.getItem('playerId');

  try {
    const res = await fetch(`/api/sessions/${code}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: playerId,
        payload: { type: 'restart' }
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Nascondi di nuovo il pulsante Rigioca
      document.getElementById('restart-btn').style.display = 'none';

      // Pulisci visivamente la griglia di gioco
      document.querySelectorAll('.cell').forEach(cell => {
        cell.innerText = '';
        cell.classList.remove('x', 'o');
      });

      // Aggiorna lo stato in alto
      document.getElementById('game-status').innerText = 'Partita riavviata! Tocca al primo giocatore.';
    }
  } catch (err) {
    console.error('Errore durante il riavvio:', err);
  }
}

// Nota: Nella tua funzione che aggiorna l'interfaccia quando qualcuno vince o pareggia,
// mostra il pulsante aggiungendo questa riga:
function checkGameOver(status) {
  if (status === 'FINISHED') {
    document.getElementById('restart-btn').style.display = 'inline-block';
  }
}