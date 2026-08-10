/**
 * src/web/public/js/app.js
 * Application Controller Client - Socket.io & REST API Client per Party Paco.
 */

(function() {
  const UI = window.PartyPacoUI;
  const socket = io();

  let state = {
    user: {
      id: localStorage.getItem('party_paco_user_id') || `web_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: localStorage.getItem('party_paco_user_name') || ''
    },
    currentRoomCode: null,
    session: null,
    selectedCategory: 'classic'
  };

  // Salva ID utente persistente
  localStorage.setItem('party_paco_user_id', state.user.id);

  // Inizializzazione Event Listeners DOM
  document.addEventListener('DOMContentLoaded', () => {
    initDOMListeners();
    initSocketListeners();
  });

  function initDOMListeners() {
    // Input nomi default
    if (state.user.name) {
      document.getElementById('host-name-input').value = state.user.name;
      document.getElementById('player-name-input').value = state.user.name;
    }

    // 1. CREAZIONE STANZA
    document.getElementById('btn-create-room').addEventListener('click', async () => {
      const nameInput = document.getElementById('host-name-input').value.trim();
      const gameId = document.getElementById('select-game-input').value;

      if (!nameInput) return alert('Inserisci il tuo nome per continuare.');
      saveUserName(nameInput);

      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            hostPlayer: { id: state.user.id, name: nameInput, channel: 'web' }
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Errore durante la creazione.');

        joinRoomSocket(data.session.code);
      } catch (err) {
        alert(err.message);
      }
    });

    // 2. UNIONE STANZA
    document.getElementById('btn-join-room').addEventListener('click', async () => {
      const nameInput = document.getElementById('player-name-input').value.trim();
      const codeInput = document.getElementById('join-code-input').value.trim().toUpperCase();

      if (!nameInput) return alert('Inserisci il tuo nome.');
      if (!codeInput || codeInput.length !== 6) return alert('Inserisci un codice stanza a 6 cifre valido.');

      saveUserName(nameInput);

      try {
        const res = await fetch(`/api/rooms/${codeInput}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player: { id: state.user.id, name: nameInput, channel: 'web' }
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Stanza non trovata.');

        joinRoomSocket(data.session.code);
      } catch (err) {
        alert(err.message);
      }
    });

    // 3. SELEZIONE CATEGORIA FRASI
    const categoryPills = document.querySelectorAll('#category-pills .pill');
    categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        categoryPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedCategory = pill.getAttribute('data-category');
      });
    });

    // 4. AVVIO PARTITA DALLA LOBBY
    document.getElementById('btn-start-game').addEventListener('click', () => {
      if (!state.currentRoomCode) return;
      dispatchAction('START_GAME', { category: state.selectedCategory });
    });

    // 5. VOTI NON HO MAI
    document.getElementById('btn-vote-done').addEventListener('click', () => {
      dispatchAction('VOTE', { vote: 'DONE' });
    });

    document.getElementById('btn-vote-never').addEventListener('click', () => {
      dispatchAction('VOTE', { vote: 'NEVER' });
    });

    // 6. PROSSIMO TURNO / FRASE
    document.getElementById('btn-next-round').addEventListener('click', () => {
      dispatchAction('NEXT_ROUND', { category: state.selectedCategory });
    });
  }

  function saveUserName(name) {
    state.user.name = name;
    localStorage.setItem('party_paco_user_name', name);
  }

  function joinRoomSocket(code) {
    state.currentRoomCode = code;
    socket.emit('joinRoom', { code, playerId: state.user.id, name: state.user.name });
    UI.updateRoomBadge(code);
  }

  async function dispatchAction(action, payload = {}) {
    if (!state.currentRoomCode) return;

    try {
      const res = await fetch(`/api/rooms/${state.currentRoomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: state.user.id,
          action,
          payload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore esecuzione azione.');
    } catch (err) {
      console.error('Errore azione:', err.message);
    }
  }

  function initSocketListeners() {
    socket.on('connect', () => {
      console.log('[Socket] Connesso al server real-time.');
      if (state.currentRoomCode) {
        joinRoomSocket(state.currentRoomCode);
      }
    });

    // Ricezione aggiornamenti di stato in tempo reale da SSOT
    socket.on('stateUpdate', (session) => {
      console.log('[Socket] Stato aggiornato:', session);
      state.session = session;

      document.getElementById('lobby-code-text').textContent = session.code;

      if (session.status === 'WAITING') {
        UI.switchScreen('screen-lobby');
        UI.renderPlayers(session.players, state.user.id);
      } else if (session.status === 'PLAYING') {
        UI.switchScreen('screen-gameplay');
        UI.renderPlayers(session.players, state.user.id);
        UI.renderNonHoMaiGameplay(session.gameState, session.players, state.user.id);
      }
    });
  }
})();
