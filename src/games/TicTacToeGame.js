const BaseGame = require('./BaseGame');

class TicTacToeGame extends BaseGame {
  init() {
    const players = Array.from(this.session.players.keys());
    this.state = {
      board: Array(9).fill(null),
      turn: players[0] || null,
      symbols: { [players[0]]: 'X', [players[1]]: 'O' },
      winner: null,
      finished: false
    };
    return this.state;
  }

  handleAction(playerId, action) {
    if (this.state.finished) return { success: false, message: 'Partita finita' };
    if (playerId !== this.state.turn) return { success: false, message: 'Non è il tuo turno' };

    const idx = parseInt(action.index, 10);
    if (idx < 0 || idx > 8 || this.state.board[idx] !== null) {
      return { success: false, message: 'Mossa non valida' };
    }

    const symbol = this.state.symbols[playerId];
    this.state.board[idx] = symbol;

    if (this.checkWin(symbol)) {
      this.state.finished = true;
      this.state.winner = playerId;
      return { success: true, message: `Vittoria di ${symbol}!` };
    }

    if (this.state.board.every(cell => cell !== null)) {
      this.state.finished = true;
      return { success: true, message: 'Pareggio!' };
    }

    const playerIds = Object.keys(this.state.symbols);
    this.state.turn = playerIds.find(id => id !== playerId);
    return { success: true, message: 'Mossa registrata' };
  }

  checkWin(sym) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    return lines.some(([a,b,c]) => 
      this.state.board[a] === sym && this.state.board[b] === sym && this.state.board[c] === sym
    );
  }
}

module.exports = TicTacToeGame;