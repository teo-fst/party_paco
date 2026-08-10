/**
 * src/web/public/js/ui.js
 * UI Manager - Gestione del Rendering e Transizioni della SPA Web.
 */

window.PartyPacoUI = {
  activeScreen: 'screen-home',

  /**
   * Cambia la schermata attiva con una transizione fluida.
   * @param {string} screenId 'screen-home', 'screen-lobby', 'screen-gameplay'
   */
  switchScreen(screenId) {
    const current = document.getElementById(this.activeScreen);
    const target = document.getElementById(screenId);

    if (current) current.classList.remove('active');
    if (target) {
      target.classList.add('active');
      this.activeScreen = screenId;
    }
  },

  /**
   * Aggiorna il badge del codice stanza nell'header.
   */
  updateRoomBadge(code) {
    const badge = document.getElementById('room-code-badge');
    const codeDisplay = document.getElementById('display-room-code');

    if (code) {
      codeDisplay.textContent = code;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  /**
   * Renderizza la lista dei giocatori connessi nella lobby.
   */
  renderPlayers(players = [], currentUserId) {
    const listEl = document.getElementById('players-list');
    const countEl = document.getElementById('player-count');

    countEl.textContent = players.length;
    listEl.innerHTML = '';

    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'player-card';

      const isMe = player.id === currentUserId;
      const meTag = isMe ? ' (Tu)' : '';
      const channelIcon = player.channel === 'telegram' ? '✈️' : '💻';

      card.innerHTML = `
        <span>${channelIcon}</span>
        <span>${this.escapeHtml(player.name)}${meTag}</span>
        ${player.isHost ? '<span class="host-tag">HOST</span>' : ''}
      `;

      listEl.appendChild(card);
    });
  },

  /**
   * Renderizza la vista del gioco "Non Ho Mai".
   */
  renderNonHoMaiGameplay(state, players, currentUserId) {
    const phraseEl = document.getElementById('phrase-text');
    const roundEl = document.getElementById('game-round-num');
    const categoryBadgeEl = document.getElementById('game-category-badge');
    const voteProgressCounter = document.getElementById('vote-progress-counter');
    const voteProgressBar = document.getElementById('vote-progress-bar');
    const liveVotesList = document.getElementById('live-votes-list');

    roundEl.textContent = state.roundNumber || 1;
    categoryBadgeEl.textContent = state.selectedCategory || 'Classico';

    if (state.currentPhrase) {
      phraseEl.textContent = `"${state.currentPhrase.text}"`;
    }

    // Aggiornamento progresso votazioni
    const votes = state.voting ? state.voting.votes : {};
    const totalVoted = Object.keys(votes).length;
    const totalExpected = players.length;

    voteProgressCounter.textContent = `${totalVoted}/${totalExpected} Votati`;
    const percentage = totalExpected > 0 ? Math.round((totalVoted / totalExpected) * 100) : 0;
    voteProgressBar.style.width = `${percentage}%`;

    // Renderizza i singoli voti del consenso
    liveVotesList.innerHTML = '';
    players.forEach(p => {
      const v = votes[p.id];
      const chip = document.createElement('div');

      let chipClass = '';
      let textVal = '⏳ In attesa...';

      if (v === 'DONE') {
        chipClass = 'chip-done';
        textVal = '🙋‍♂️ L\'ha fatto!';
      } else if (v === 'NEVER') {
        chipClass = 'chip-never';
        textVal = '😇 Mai fatto';
      }

      chip.className = `vote-chip ${chipClass}`;
      chip.innerHTML = `
        <span>${this.escapeHtml(p.name)}</span>
        <strong>${textVal}</strong>
      `;
      liveVotesList.appendChild(chip);
    });

    // Se il giocatore corrente ha già votato, evidenzia i bottoni
    const btnDone = document.getElementById('btn-vote-done');
    const btnNever = document.getElementById('btn-vote-never');

    btnDone.classList.remove('voted');
    btnNever.classList.remove('voted');

    const myVote = votes[currentUserId];
    if (myVote === 'DONE') btnDone.classList.add('voted');
    if (myVote === 'NEVER') btnNever.classList.add('voted');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }
};
