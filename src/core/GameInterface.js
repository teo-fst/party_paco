/**
 * src/core/GameInterface.js
 * Interfaccia / Contratto Astratto per Moduli Gioco in Party Paco Framework.
 * 
 * Ogni gioco (es. "Non Ho Mai", "Chi di Noi", "Trivia") DEVE estendere questa classe
 * e implementarne i metodi per potersi integrare plug-and-play nel core del sistema.
 */

class GameInterface {
  constructor() {
    if (this.constructor === GameInterface) {
      throw new Error("Impossibile istanziare direttamente una GameInterface astratta.");
    }
  }

  /**
   * Identificatore univoco del modulo gioco (es. 'non-ho-mai')
   * @returns {string}
   */
  get id() {
    throw new Error("Il metodo 'id' deve essere implementato nel modulo gioco.");
  }

  /**
   * Nome visualizzato del gioco (es. 'Non Ho Mai')
   * @returns {string}
   */
  get name() {
    throw new Error("Il metodo 'name' deve essere implementato nel modulo gioco.");
  }

  /**
   * Breve descrizione e regole del gioco
   * @returns {string}
   */
  get description() {
    return "";
  }

  /**
   * Numero minimo di giocatori richiesti per avviare la partita
   * @returns {number}
   */
  get minPlayers() {
    return 2;
  }

  /**
   * Numero massimo di giocatori consentiti (opzionale, null per illimitato)
   * @returns {number|null}
   */
  get maxPlayers() {
    return null;
  }

  /**
   * Inizializza lo stato interno specifico del gioco all'avvio della sessione.
   * 
   * @param {Object} session Object della sessione core
   * @param {Object} options Configurazione iniziale scelta dall'host (es. { category: 'spicy' })
   * @returns {Object} Stato iniziale specifico del gioco
   */
  initGameState(session, options = {}) {
    throw new Error("Il metodo 'initGameState' deve essere implementato.");
  }

  /**
   * Gestisce un'azione inviata da un giocatore (da Web REST/WebSocket o Telegram).
   * 
   * @param {Object} session Sessione di gioco corrente
   * @param {Object} player Oggetto del giocatore che compie l'azione
   * @param {string} action Nome dell'azione (es. 'DRAW_PHRASE', 'VOTE')
   * @param {Object} payload Dati aggiuntivi dell'azione
   * @returns {{ updatedState: Object, events: Array<Object> }} Nuovo stato del gioco ed eventuali eventi da propagare
   */
  handleAction(session, player, action, payload = {}) {
    throw new Error("Il metodo 'handleAction' deve essere implementato.");
  }

  /**
   * Restituisce la vista pubblica o personalizzata dello stato di gioco per un determinato giocatore.
   * Utile per giochi con informazioni nascoste (es. carte segrete o ruoli).
   * 
   * @param {Object} session Sessione corrente
   * @param {string|null} playerId ID del giocatore richiedente
   * @returns {Object} Stato pubblico/personalizzato
   */
  getPublicState(session, playerId = null) {
    return session.gameState || {};
  }

  /**
   * Restituisce la rappresentazione formattata per i messaggi ed Inline Keyboards Telegram.
   * 
   * @param {Object} session Sessione di gioco corrente
   * @returns {{ text: string, reply_markup: Object }} Configurazione messaggio Telegram
   */
  renderTelegramView(session) {
    return {
      text: `🎮 <b>${this.name}</b> in corso (Stanza: <code>${session.code}</code>)`,
      reply_markup: { inline_keyboard: [] }
    };
  }
}

module.exports = GameInterface;
