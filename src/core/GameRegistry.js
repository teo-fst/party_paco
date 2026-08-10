/**
 * src/core/GameRegistry.js
 * Registro centrale e caricatore plug-and-play dei moduli gioco.
 * 
 * Mantiene un dizionario dei giochi attivi e consente di recuperare
 * i metadati e le istanze dei giochi caricati.
 */

const GameInterface = require('./GameInterface');

class GameRegistry {
  constructor() {
    // Map { gameId: GameInterfaceInstance }
    this.games = new Map();
  }

  /**
   * Registra un nuovo modulo gioco nel framework.
   * 
   * @param {GameInterface} gameInstance Istanza di una classe estesa da GameInterface
   */
  registerGame(gameInstance) {
    if (!(gameInstance instanceof GameInterface)) {
      throw new Error(`Il gioco da registrare deve estendere GameInterface.`);
    }

    const gameId = gameInstance.id;
    if (this.games.has(gameId)) {
      console.warn(`[GameRegistry] Sovrascrittura gioco esistente con ID '${gameId}'`);
    }

    this.games.set(gameId, gameInstance);
    console.log(`[GameRegistry] Registrato modulo gioco: "${gameInstance.name}" (${gameId})`);
  }

  /**
   * Restituisce un'istanza di gioco caricata per ID.
   * @param {string} gameId 
   * @returns {GameInterface|null}
   */
  getGame(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Restituisce l'elenco di tutti i giochi registrati nel formato utile per la scelta dell'Host.
   * @returns {Array<Object>}
   */
  listGames() {
    const list = [];
    for (const game of this.games.values()) {
      list.push({
        id: game.id,
        name: game.name,
        description: game.description,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers
      });
    }
    return list;
  }
}

module.exports = new GameRegistry();
