class BaseGame {
  constructor(session) {
    this.session = session;
    this.state = {};
  }

  init() {
    throw new Error('Metodo init() non implementato');
  }

  handleAction(playerId, action) {
    throw new Error('Metodo handleAction() non implementato');
  }

  getState() {
    return this.state;
  }
}

module.exports = BaseGame;