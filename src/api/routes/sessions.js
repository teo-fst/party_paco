const express = require('express');
const router = express.Router();
const sessionManager = require('../../core/SessionManager');
const TicTacToeGame = require('../../games/TicTacToeGame');
const TruthOrDareGame = require('../../games/TruthOrDareGame');

const EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🐯', '🐙', '🦄', '🐲'];

// 1. Recupera la lista delle stanze attive (eliminando prima le stanze fantasma/inattive)
router.get('/', (req, res) => {
  try {
    const { gameType } = req.query;

    // Svuota dalla RAM e dal DB SQLite le stanze inattive da oltre 45 secondi
    sessionManager.cleanInactiveSessions(45000);

    const availableRooms = [];

    for (const session of sessionManager.sessions.values()) {
      if (!session) continue;

      const playerCount = session.players ? session.players.size : 0;
      const matchesGame = !gameType || session.gameType === gameType;
      const isWaiting = session.status === 'WAITING';

      if (isWaiting && matchesGame && playerCount > 0) {
        const hostPlayer = session.hostId ? session.players.get(session.hostId) : null;
        const firstPlayer = Array.from(session.players.values())[0];

        availableRooms.push({
          code: session.code,
          gameType: session.gameType,
          playerCount: playerCount,
          hostName: hostPlayer ? hostPlayer.username : (firstPlayer ? firstPlayer.username : 'Giocatore')
        });
      }
    }

    res.json(availableRooms);
  } catch (err) {
    console.error('Errore GET /sessions:', err);
    res.status(500).json({ error: 'Errore nel recupero delle stanze' });
  }
});

// 2. Crea una nuova stanza
router.post('/', (req, res, next) => {
  try {
    const { gameType } = req.body;
    if (!gameType) return res.status(400).json({ error: 'gameType richiesto' });
    const session = sessionManager.createSession(gameType);
    session.hostId = null;
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// 3. Ottieni lo stato della stanza (aggiorna anche l'ultimo timestamp di attività)
router.get('/:code', (req, res, next) => {
  try {
    const session = sessionManager.getSession(req.params.code);
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
    
    res.json({
      code: session.code,
      gameType: session.gameType,
      status: session.status,
      hostId: session.hostId,
      players: Object.fromEntries(session.players),
      gameState: session.gameInstance ? session.gameInstance.state : session.gameState
    });
  } catch (err) {
    next(err);
  }
});

// 4. Ingresso Giocatore
router.post('/:code/join', (req, res, next) => {
  try {
    const session = sessionManager.getSession(req.params.code);
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    let { playerId, username } = req.body;

    if (playerId && session.players.has(playerId)) {
      if (!session.hostId) session.hostId = playerId;
      return res.json({ success: true, player: session.players.get(playerId) });
    }

    const telegramId = Math.floor(Math.random() * 1000000);
    const chosenName = username || `Giocatore ${session.players.size + 1}`;
    
    const player = sessionManager.addPlayer(req.params.code, telegramId, chosenName);
    player.emoji = EMOJIS[(session.players.size - 1) % EMOJIS.length] || '🎮';

    if (!session.hostId) {
      session.hostId = player.id;
    }

    if (session.gameType === 'tictactoe' && session.players.size >= 2 && !session.gameInstance) {
      const game = new TicTacToeGame(session);
      game.init();
      session.gameInstance = game;
      session.gameState = game.state;
      session.status = 'PLAYING';
    }

    res.json({ success: true, player });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Avvio Manuale della Partita
router.post('/:code/start', (req, res, next) => {
  try {
    const { playerId } = req.body;
    const session = sessionManager.getSession(req.params.code);

    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
    if (session.hostId && playerId !== session.hostId) {
      return res.status(403).json({ error: 'Solo il creatore della stanza può avviare la partita!' });
    }
    if (session.players.size < 2) {
      return res.status(400).json({ error: 'Servono almeno 2 giocatori per iniziare.' });
    }

    if (session.gameType === 'truthordare') {
      const game = new TruthOrDareGame(session);
      game.init();
      session.gameInstance = game;
      session.gameState = game.state;
      session.status = 'PLAYING';
    }

    res.json({ success: true, gameState: session.gameState });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Azione di gioco (con supporto al riavvio/rigioca)
router.post('/:code/action', (req, res) => {
  try {
    const { playerId, payload } = req.body;
    const session = sessionManager.getSession(req.params.code);

    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });

    // Se l'azione è un restart, reinizializza la partita
    if (payload && payload.type === 'restart') {
      session.status = 'PLAYING';
      
      // Resetta lo stato interno del gioco Tris
      if (session.gameType === 'tictactoe' && session.gameInstance) {
        if (typeof session.gameInstance.reset === 'function') {
          session.gameInstance.reset();
        } else {
          // Ricrea la partita da zero se non c'è un metodo reset
          const TicTacToeGame = require('../../core/games/TicTacToeGame');
          session.gameInstance = new TicTacToeGame(session);
          session.gameInstance.init();
        }
        session.gameState = session.gameInstance.state;
      }

      return res.json({ success: true, gameState: session.gameState });
    }

    // Gestione normale delle mosse
    if (!session.gameInstance) return res.status(400).json({ error: 'Partita non attiva' });
    const result = session.gameInstance.handleAction(playerId, payload);
    
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Abbandona la stanza
router.post('/:code/leave', (req, res, next) => {
  try {
    const { playerId } = req.body;
    const session = sessionManager.getSession(req.params.code);

    if (!session) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    console.log(`[LEAVE] Stanza: ${session.code} | Chi esce: ${playerId} | Host attuale: ${session.hostId}`);

    // Se l'ID coincide con l'host OPPURE chi esce è l'unico rimasto OPPURE non viene passato un playerId valido
    const isHost = session.hostId && (session.hostId === playerId || session.hostId.toString() === playerId?.toString());
    const isLastPlayer = session.players.size <= 1;

    if (isHost || isLastPlayer || !playerId) {
      console.log(`[DESTROY] Eliminazione stanza ${session.code} (Host uscito o stanza vuota).`);
      sessionManager.deleteSession(session.code);
      return res.json({ success: true, destroyed: true });
    }

    // Se esce un partecipante normale
    if (session.players.has(playerId)) {
      session.players.delete(playerId);

      if (session.gameInstance && typeof session.gameInstance.handlePlayerLeave === 'function') {
        session.gameInstance.handlePlayerLeave(playerId);
      }

      if (session.players.size < 2) {
        session.status = 'WAITING';
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Errore durante leave:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;