/**
 * src/core/SessionManager.js
 * Manager delle Sessioni di Gioco (Game Rooms).
 * 
 * Gestisce la creazione delle stanze con codice a 6 cifre alfanumeriche,
 * il tracciamento dei giocatori, la persistenza e lo stato delle partite.
 */

const config = require('../config');
const database = require('./Database');
const gameRegistry = require('./GameRegistry');

class SessionManager {
  constructor() {
    // Map { code: sessionObject }
    this.sessions = new Map();
  }

  /**
   * Genera un codice univoco di 6 caratteri alfanumerici (es. A7B9X2).
   */
  generateCode() {
    const alphabet = config.session.codeAlphabet;
    let code = '';
    do {
      code = '';
      for (let i = 0; i < config.session.codeLength; i++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length);
        code += alphabet[randomIndex];
      }
    } while (this.sessions.has(code));
    return code;
  }

  /**
   * Crea una nuova sessione di gioco.
   * 
   * @param {string} gameId ID del gioco selezionato dall'host
   * @param {Object} hostPlayer { id, name, channel: 'web'|'telegram' }
   * @param {Object} options Opzioni iniziali per il gioco
   * @returns {Object} Oggetto sessione creato
   */
  createSession(gameId, hostPlayer, options = {}) {
    const game = gameRegistry.getGame(gameId);
    if (!game) {
      throw new Error(`Gioco con ID '${gameId}' non trovato.`);
    }

    const code = this.generateCode();
    const playerId = hostPlayer.id || `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const host = {
      id: playerId,
      name: hostPlayer.name || 'Host',
      channel: hostPlayer.channel || 'web',
      isHost: true,
      telegramChatId: hostPlayer.telegramChatId || null,
      joinedAt: Date.now()
    };

    const session = {
      code,
      gameId,
      status: 'WAITING', // WAITING, PLAYING, FINISHED
      hostId: host.id,
      players: [host],
      gameState: {},
      options,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Inizializza lo stato specifico del modulo gioco
    session.gameState = game.initGameState(session, options);

    this.sessions.set(code, session);
    database.saveSession(session);

    console.log(`[SessionManager] Stanza creata: [${code}] Gioco: ${game.name} - Host: ${host.name}`);
    return session;
  }

  /**
   * Recupera una sessione dal codice (in-memory o DB fallback).
   */
  getSession(code) {
    if (!code) return null;
    const cleanCode = code.toUpperCase().trim();
    
    if (this.sessions.has(cleanCode)) {
      return this.sessions.get(cleanCode);
    }

    // Prova a ricaricare dal DB
    const dbSession = database.getSession(cleanCode);
    if (dbSession) {
      this.sessions.set(cleanCode, dbSession);
      return dbSession;
    }

    return null;
  }

  /**
   * Unisce un nuovo giocatore a una sessione esistente.
   * 
   * @param {string} code Codice stanza a 6 cifre
   * @param {Object} playerData { id, name, channel, telegramChatId }
   * @returns {{ session: Object, player: Object }}
   */
  joinSession(code, playerData) {
    const session = this.getSession(code);
    if (!session) {
      throw new Error(`Stanza non trovata con il codice: ${code}`);
    }

    // Cerca se il giocatore esiste già (riconnessione)
    let player = session.players.find(p => p.id === playerData.id || (playerData.telegramChatId && p.telegramChatId === playerData.telegramChatId));

    if (!player) {
      const playerId = playerData.id || `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      player = {
        id: playerId,
        name: playerData.name || `Giocatore_${session.players.length + 1}`,
        channel: playerData.channel || 'web',
        isHost: false,
        telegramChatId: playerData.telegramChatId || null,
        joinedAt: Date.now()
      };
      session.players.push(player);
    } else {
      // Aggiorna canale o nome se variato
      player.name = playerData.name || player.name;
      player.channel = playerData.channel || player.channel;
      if (playerData.telegramChatId) player.telegramChatId = playerData.telegramChatId;
    }

    session.updatedAt = Date.now();
    database.saveSession(session);

    console.log(`[SessionManager] Giocatore "${player.name}" entrato nella stanza [${code}]`);
    return { session, player };
  }

  /**
   * Esegue un'azione di gioco all'interno della sessione inoltrandola al modulo gioco.
   */
  dispatchAction(code, playerId, action, payload = {}) {
    const session = this.getSession(code);
    if (!session) {
      throw new Error(`Stanza ${code} non trovata.`);
    }

    const game = gameRegistry.getGame(session.gameId);
    if (!game) {
      throw new Error(`Modulo gioco per ${session.gameId} non registrato.`);
    }

    const player = session.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Giocatore non appartenente alla stanza.`);
    }

    // Inoltra l'azione al modulo gioco
    const { updatedState, events } = game.handleAction(session, player, action, payload);

    session.gameState = updatedState;
    session.updatedAt = Date.now();

    database.saveSession(session);
    database.logGameAction(code, session.gameId, action, playerId, payload);

    return { session, events: events || [] };
  }

  /**
   * Rimuove un giocatore da una sessione esistente.
   * Se il giocatore è l'host, assegna il ruolo di host al prossimo partecipante.
   * Se la stanza rimane vuota, la chiude/rimuove.
   * 
   * @param {string} code Codice stanza
   * @param {string} playerId ID del giocatore uscente
   * @returns {{ session: Object|null, removedPlayer: Object }}
   */
  leaveSession(code, playerId) {
    const session = this.getSession(code);
    if (!session) {
      throw new Error(`Stanza non trovata con il codice: ${code}`);
    }

    const playerIndex = session.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { session, removedPlayer: null };
    }

    const [removedPlayer] = session.players.splice(playerIndex, 1);

    // Se la stanza è vuota, chiudila
    if (session.players.length === 0) {
      session.status = 'FINISHED';
      this.sessions.delete(session.code);
      database.saveSession(session);
      console.log(`[SessionManager] Stanza [${code}] chiusa (tutti i giocatori sono usciti).`);
      return { session: null, removedPlayer };
    }

    // Se l'utente uscente era l'host, trasferisci il ruolo al primo partecipante rimanente
    if (removedPlayer.isHost) {
      session.players[0].isHost = true;
      session.hostId = session.players[0].id;
      console.log(`[SessionManager] Nuovo host per la stanza [${code}]: ${session.players[0].name}`);
    }

    session.updatedAt = Date.now();
    database.saveSession(session);
    console.log(`[SessionManager] Giocatore "${removedPlayer.name}" ha lasciato la stanza [${code}]`);

    return { session, removedPlayer };
  }
}

module.exports = new SessionManager();
