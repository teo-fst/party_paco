/**
 * src/core/Database.js
 * Database Storage Layer basato su SQLite.
 * Gestisce l'inizializzazione delle tabelle e le query di persistenza.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    // Assicura che la cartella data esista
    if (!fs.existsSync(config.storage.dataDir)) {
      fs.mkdirSync(config.storage.dataDir, { recursive: true });
    }

    try {
      const DatabaseDriver = require('better-sqlite3');
      this.db = new DatabaseDriver(config.storage.dbPath);
      this.db.pragma('journal_mode = WAL');
      console.log(`[Database] SQLite connesso con successo: ${config.storage.dbPath}`);
      this._createTables();
    } catch (err) {
      console.warn(`[Database] Impossibile caricare better-sqlite3 (${err.message}). Utilizzo in-memory fallback log.`);
      this.db = null;
    }
  }

  _createTables() {
    if (!this.db) return;

    // Tabelle per persistenza sessioni e statistiche
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        code TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        status TEXT NOT NULL,
        host_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        state_json TEXT
      );

      CREATE TABLE IF NOT EXISTS game_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_code TEXT NOT NULL,
        game_id TEXT NOT NULL,
        action TEXT NOT NULL,
        player_id TEXT,
        payload_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  saveSession(session) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (code, game_id, status, host_id, state_json, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(code) DO UPDATE SET
          status = excluded.status,
          state_json = excluded.state_json,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(
        session.code,
        session.gameId,
        session.status,
        session.hostId,
        JSON.stringify(session)
      );
    } catch (err) {
      console.error('[Database] Errore durante saveSession:', err.message);
    }
  }

  logGameAction(sessionCode, gameId, action, playerId, payload) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO game_logs (session_code, game_id, action, player_id, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(sessionCode, gameId, action, playerId || null, JSON.stringify(payload));
    } catch (err) {
      console.error('[Database] Errore durante logGameAction:', err.message);
    }
  }

  getSession(code) {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare('SELECT state_json FROM sessions WHERE code = ?');
      const row = stmt.get(code);
      return row ? JSON.parse(row.state_json) : null;
    } catch (err) {
      console.error('[Database] Errore durante getSession:', err.message);
      return null;
    }
  }

  deleteSession(code) {
    if (!this.db || !code) return;
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE code = ?');
      stmt.run(code);
    } catch (err) {
      console.error('[Database] Errore durante deleteSession:', err.message);
    }
  }
}

module.exports = new Database();
