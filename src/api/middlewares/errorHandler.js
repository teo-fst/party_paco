const logger = require('../../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Errore HTTP API');
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
};