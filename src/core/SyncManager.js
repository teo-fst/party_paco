/**
 * src/core/SyncManager.js
 * Synchronizer Multi-Canale per Sincronizzazione Real-Time tra WebSockets e Telegram.
 * 
 * Garantisce che lo stato di gioco rimanga sempre sincronizzato e consistente
 * indipendentemente dal canale utilizzato dai singoli utenti.
 */

const gameRegistry = require('./GameRegistry');

class SyncManager {
  constructor() {
    this.io = null;
    this.telegramAdapter = null;
  }

  /**
   * Collega il server Socket.io al gestore di sincronizzazione.
   * @param {Object} io Istanza del server Socket.io
   */
  attachSocketServer(io) {
    this.io = io;
    console.log('[SyncManager] Server Socket.io collegato.');
  }

  /**
   * Collega l'adattatore del Bot Telegram.
   * @param {Object} telegramAdapter
   */
  attachTelegramAdapter(telegramAdapter) {
    this.telegramAdapter = telegramAdapter;
    console.log('[SyncManager] Telegram Adapter collegato.');
  }

  /**
   * Propaga lo stato aggiornato della sessione a TUTTI i canali collegati.
   * 
   * @param {Object} session Sessione di gioco aggiornata
   */
  broadcastSessionState(session) {
    if (!session) return;

    const game = gameRegistry.getGame(session.gameId);
    const publicState = game ? game.getPublicState(session) : session.gameState;

    const payload = {
      code: session.code,
      gameId: session.gameId,
      status: session.status,
      hostId: session.hostId,
      players: session.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        channel: p.channel
      })),
      gameState: publicState,
      updatedAt: session.updatedAt
    };

    // 1. Trasmissione via WebSocket a tutti i client registrati nella stanza socket `room:CODE`
    if (this.io) {
      this.io.to(`room:${session.code}`).emit('stateUpdate', payload);
    }

    // 2. Trasmissione ed aggiornamento dell'interfaccia Telegram Inline per i giocatori Telegram
    if (this.telegramAdapter && typeof this.telegramAdapter.syncTelegramViews === 'function') {
      this.telegramAdapter.syncTelegramViews(session);
    }
  }

  /**
   * Invia un evento personalizzato in broadcast ai WebSocket della stanza.
   */
  broadcastEvent(code, eventName, data) {
    if (this.io) {
      this.io.to(`room:${code}`).emit(eventName, data);
    }
  }
}

module.exports = new SyncManager();
