/**
 * src/index.js
 * Entry point dell'applicazione Party Paco Multi-Game Framework.
 * 
 * Inizializza Express, Socket.io, Telegram Bot, Storage SQLite e carica i giochi registrati.
 */

const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

const config = require('./config');
const gameRegistry = require('./core/GameRegistry');
const sessionManager = require('./core/SessionManager');
const syncManager = require('./core/SyncManager');
const telegramBot = require('./bot/telegramBot');

// 1. REGISTRAZIONE MODULI GIOCO (Plug-and-Play)
const nonHoMaiGame = require('./games/non-ho-mai');
gameRegistry.registerGame(nonHoMaiGame);

// 2. INIZIALIZZAZIONE EXPRESS & HTTP SERVER
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware Express
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web', 'public')));

// 3. API REST ENDPOINTS

// Endpoint di stato / healthcheck per Docker e monitoraggio
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.env });
});

// Informazioni sul framework e giochi disponibili
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Party Paco Multi-Game Center',
    version: '1.0.0',
    registeredGames: gameRegistry.listGames()
  });
});

// Elenco giochi registrati
app.get('/api/games', (req, res) => {
  res.json(gameRegistry.listGames());
});

// Creazione di una nuova stanza/sessione
app.post('/api/rooms', (req, res) => {
  try {
    const { gameId, hostPlayer, options } = req.body;
    if (!gameId || !hostPlayer) {
      return res.status(400).json({ error: "I campi 'gameId' e 'hostPlayer' sono obbligatori." });
    }

    const session = sessionManager.createSession(gameId, hostPlayer, options || {});
    syncManager.broadcastSessionState(session);

    res.status(201).json({ success: true, session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Recupero stato stanza
app.get('/api/rooms/:code', (req, res) => {
  const session = sessionManager.getSession(req.params.code);
  if (!session) {
    return res.status(404).json({ error: "Stanza non trovata." });
  }
  res.json({ session });
});

// Unione a una stanza
app.post('/api/rooms/:code/join', (req, res) => {
  try {
    const { player } = req.body;
    if (!player) {
      return res.status(400).json({ error: "Oggetto 'player' obbligatorio." });
    }

    const { session, player: joinedPlayer } = sessionManager.joinSession(req.params.code, player);
    syncManager.broadcastSessionState(session);

    res.json({ success: true, session, player: joinedPlayer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Esecuzione di un'azione di gioco
app.post('/api/rooms/:code/action', (req, res) => {
  try {
    const { playerId, action, payload } = req.body;
    if (!playerId || !action) {
      return res.status(400).json({ error: "I campi 'playerId' e 'action' sono obbligatori." });
    }

    const { session, events } = sessionManager.dispatchAction(req.params.code, playerId, action, payload || {});
    syncManager.broadcastSessionState(session);

    res.json({ success: true, session, events });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Uscita da una stanza
app.post('/api/rooms/:code/leave', (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: "Il campo 'playerId' è obbligatorio." });
    }

    const { session } = sessionManager.leaveSession(req.params.code, playerId);
    if (session) {
      syncManager.broadcastSessionState(session);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. REAL-TIME SOCKET.IO ENGINE
syncManager.attachSocketServer(io);

io.on('connection', (socket) => {
  console.log(`[Socket] Nuovo client connesso (ID: ${socket.id})`);

  socket.on('joinRoom', ({ code, playerId, name }) => {
    if (!code) return;
    const cleanCode = code.toUpperCase().trim();
    socket.join(`room:${cleanCode}`);

    try {
      const { session } = sessionManager.joinSession(cleanCode, {
        id: playerId,
        name: name || 'Giocatore Web',
        channel: 'web'
      });
      syncManager.broadcastSessionState(session);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('leaveRoom', ({ code, playerId }) => {
    if (!code) return;
    const cleanCode = code.toUpperCase().trim();
    socket.leave(`room:${cleanCode}`);

    try {
      const { session } = sessionManager.leaveSession(cleanCode, playerId);
      if (session) {
        syncManager.broadcastSessionState(session);
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnesso (ID: ${socket.id})`);
  });
});

// 5. INIZIALIZZAZIONE TELEGRAM BOT
telegramBot.init();

// 6. AVVIO SERVER
server.listen(config.port, config.host, () => {
  console.log(`
  ═════════════════════════════════════════════════════════════════
  🎉 PARTY PACO - MULTI-GAME CENTER AVVIATO CON SUCCESSO!
  👉 Server HTTP & WebApp: http://localhost:${config.port}
  👉 Healthcheck:          http://localhost:${config.port}/health
  👉 Bot Telegram:         ${config.telegram.enabled ? 'ABILITATO' : 'DISABILITATO (dry-run)'}
  ═════════════════════════════════════════════════════════════════
  `);
});
