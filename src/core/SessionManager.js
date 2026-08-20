const db = require('../db');
const logger = require('../utils/logger');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.restoreFromDb();
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.sessions.has(code));
    return code;
  }

  createSession(gameType) {
    const code = this.generateCode();
    const session = {
      code,
      gameType,
      status: 'WAITING',
      players: new Map(),
      gameState: null,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(code, session);

    const stmt = db.prepare('INSERT INTO sessions (code, game_type, status) VALUES (?, ?, ?)');
    stmt.run(code, gameType, 'WAITING');

    logger.info({ code, gameType }, 'Sessione creata');
    return session;
  }

  getSession(code) {
    if (!code) return null;
    const session = this.sessions.get(code.toUpperCase());
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  addPlayer(code, telegramId, username) {
    const session = this.getSession(code);
    if (!session) throw new Error('Sessione non trovata');

    const playerId = `tg_${telegramId}`;
    const player = { id: playerId, telegramId, username, score: 0 };

    session.players.set(playerId, player);
    session.lastActivity = Date.now();

    const stmt = db.prepare(`
      INSERT INTO players (id, session_code, username, telegram_id, score)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET session_code=excluded.session_code
    `);
    stmt.run(playerId, session.code, username, telegramId, 0);

    return player;
  }

  removePlayer(code, telegramId) {
    const session = this.getSession(code);
    if (!session) return;

    const playerId = `tg_${telegramId}`;
    session.players.delete(playerId);

    db.prepare('DELETE FROM players WHERE id = ?').run(playerId);

    if (session.players.size === 0) {
      this.deleteSession(code);
    }
  }

  deleteSession(code) {
    this.sessions.delete(code);
    db.prepare('DELETE FROM sessions WHERE code = ?').run(code);
    db.prepare('DELETE FROM game_states WHERE session_code = ?').run(code);
    db.prepare('DELETE FROM players WHERE session_code = ?').run(code);
    logger.info({ code }, 'Sessione eliminata per inattività o assenza di giocatori');
  }

  // Pulisce le stanze abbandonate o inattive
  cleanInactiveSessions(maxInactivityMs = 600000) { // 10 minuti
    const now = Date.now();
    for (const [code, session] of this.sessions.entries()) {
      const isExpired = (now - session.lastActivity) > maxInactivityMs;
      const isEmpty = session.players.size === 0;

      if (isEmpty || isExpired) {
        this.deleteSession(code);
      }
    }
  }

  persistState(code, state) {
    const session = this.getSession(code);
    if (session) {
      session.gameState = state;
      session.lastActivity = Date.now();
      const json = JSON.stringify(state);
      db.prepare(`
        INSERT INTO game_states (session_code, state_json) VALUES (?, ?)
        ON CONFLICT(session_code) DO UPDATE SET state_json=excluded.state_json, updated_at=CURRENT_TIMESTAMP
      `).run(code, json);
    }
  }

  restoreFromDb() {
    try {
      db.prepare(`
        DELETE FROM sessions 
        WHERE code NOT IN (SELECT DISTINCT session_code FROM players)
      `).run();

      const activeSessions = db.prepare("SELECT * FROM sessions WHERE status != 'FINISHED'").all();

      for (const row of activeSessions) {
        const players = db.prepare("SELECT * FROM players WHERE session_code = ?").all(row.code);

        if (!players || players.length === 0) {
          this.deleteSession(row.code);
          continue;
        }

        const stateRow = db.prepare("SELECT state_json FROM game_states WHERE session_code = ?").get(row.code);

        const playerMap = new Map();
        players.forEach(p => playerMap.set(p.id, { id: p.id, telegramId: p.telegram_id, username: p.username, score: p.score }));

        this.sessions.set(row.code, {
          code: row.code,
          gameType: row.game_type,
          status: row.status,
          players: playerMap,
          gameState: stateRow ? JSON.parse(stateRow.state_json) : null,
          createdAt: Date.now(),
          lastActivity: Date.now()
        });
      }
      logger.info({ count: this.sessions.size }, 'Stato sessioni ripristinato dal DB');
    } catch (err) {
      logger.error(err, 'Errore durante il ripristino sessioni da DB');
    }
  }
}

module.exports = new SessionManager();