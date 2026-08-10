/**
 * src/config.js
 * Configurazione centralizzata dell'applicazione.
 * Legge da variabili d'ambiente (.env) e fornisce default sicuri.
 */

const path = require('path');
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '6767', 10),
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    enabled: process.env.TELEGRAM_ENABLED === 'true' && Boolean(process.env.TELEGRAM_BOT_TOKEN)
  },

  storage: {
    dataDir: path.resolve(process.env.DATA_DIR || './data'),
    dbPath: path.resolve(process.env.DB_PATH || './data/party_paco.db')
  },

  session: {
    codeLength: 6,
    codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Esclude caratteri ambigui come O, 0, I, 1
    inactivityTimeoutMs: 2 * 60 * 60 * 1000 // 2 ore
  }
};

module.exports = config;
