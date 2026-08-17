const express = require('express');
const router = express.Router();
const sessionManager = require('../../core/SessionManager');

router.post('/', (req, res, next) => {
  try {
    const { gameType } = req.body;
    if (!gameType) return res.status(400).json({ error: 'gameType richiesto' });
    const session = sessionManager.createSession(gameType);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.get('/:code', (req, res, next) => {
  try {
    const session = sessionManager.getSession(req.params.code);
    if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
    
    // Serializzazione Map -> Object
    const responseData = {
      ...session,
      players: Object.fromEntries(session.players)
    };
    res.json(responseData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;