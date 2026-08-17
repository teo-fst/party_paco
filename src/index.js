require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const errorHandler = require('./api/middlewares/errorHandler');
const sessionsRouter = require('./api/routes/sessions');
const setupBot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api/sessions', sessionsRouter);

// Global Error Handler
app.use(errorHandler);

// Server Init
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`[Certo] API Server party_paco in ascolto sulla porta ${PORT}`);
  setupBot();
});