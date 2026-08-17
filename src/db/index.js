const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/party_paco.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS sessions (
      code TEXT PRIMARY KEY,
      game_type TEXT,
      status TEXT CHECK(status IN ('WAITING', 'IN_PROGRESS', 'FINISHED')) DEFAULT 'WAITING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      session_code TEXT,
      username TEXT,
      telegram_id INTEGER,
      score INTEGER DEFAULT 0,
      FOREIGN KEY(session_code) REFERENCES sessions(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_states (
      session_code TEXT PRIMARY KEY,
      state_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_code) REFERENCES sessions(code) ON DELETE CASCADE
    );
  `;
  db.exec(schema);
  logger.info({ dbPath }, '[Certo] Database SQLite inizializzato in modalità WAL');
}

initDb();

module.exports = db;