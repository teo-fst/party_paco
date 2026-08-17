const TicTacToeGame = require('../games/TicTacToeGame');
const sessionManager = require('./SessionManager');

class GameManager {
  constructor() {
    this.games = new Map();
    this.registry = {
      'tictactoe': TicTacToeGame,
    };
  }

  startGame(sessionCode) {
    const session = sessionManager.getSession(sessionCode);
    if (!session) throw new Error('Sessione inesistente');

    const GameClass = this.registry[session.gameType];
    if (!GameClass) throw new Error(`Gioco ${session.gameType} non supportato`);

    const instance = new GameClass(session);
    const initialState = instance.init();
    
    session.status = 'IN_PROGRESS';
    this.games.set(sessionCode, instance);
    sessionManager.persistState(sessionCode, initialState);

    return initialState;
  }

  getGame(sessionCode) {
    return this.games.get(sessionCode);
  }

  executeAction(sessionCode, playerId, action) {
    const game = this.getGame(sessionCode);
    if (!game) throw new Error('Partita non in corso');

    const result = game.handleAction(playerId, action);
    sessionManager.persistState(sessionCode, game.getState());
    return result;
  }
}

module.exports = new GameManager();