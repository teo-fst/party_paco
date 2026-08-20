require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const errorHandler = require('./api/middlewares/errorHandler');
const sessionsRouter = require('./api/routes/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/sessions', sessionsRouter);

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'party_paco_app',
    status: 'online',
    endpoints: {
      sessions: '/api/sessions'
    }
  });
});

// Global Error Handler
app.use(errorHandler);

// Bot Telegram temporaneamente DISATTIVATO
/*
const setupBot = require('./bot');
try {
  const bot = setupBot();
  if (bot && typeof bot.launch === 'function') {
    bot.launch({ dropPendingUpdates: true });
  }
} catch (err) {
  console.error('Errore bot:', err.message);
}
*/

// Avvio Server Express
app.listen(PORT, () => {
  console.log(`🚀 Server Party Paco attivo su http://localhost:${PORT}`);
});