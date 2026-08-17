const { Telegraf } = require('telegraf');
const sessionManager = require('../core/SessionManager');
const gameManager = require('../core/GameManager');
const logger = require('../utils/logger');

function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn('[Ipotesi] TELEGRAM_BOT_TOKEN mancante. Il bot Telegram non verrà avviato.');
    return null;
  }

  const bot = new Telegraf(token);

  bot.start((ctx) => ctx.reply('Benvenuto in Party Paco! Usa /newgame <tipo> per creare una stanza o /join <code> per unirti.'));

  bot.command('newgame', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const gameType = parts[1] || 'guess_number';

    try {
      const session = sessionManager.createSession(gameType);
      sessionManager.addPlayer(session.code, ctx.from.id, ctx.from.username || ctx.from.first_name);
      ctx.reply(`Stanza creata! Codice: ${session.code}\nUsa /startgame ${session.code} quando tutti sono pronti.`);
    } catch (err) {
      ctx.reply(`Errore: ${err.message}`);
    }
  });

  bot.command('join', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const code = parts[1];
    if (!code) return ctx.reply('Inserisci il codice della stanza: /join <CODICE>');

    try {
      sessionManager.addPlayer(code, ctx.from.id, ctx.from.username || ctx.from.first_name);
      ctx.reply(`Ti sei unito alla stanza ${code.toUpperCase()}!`);
    } catch (err) {
      ctx.reply(`Errore: ${err.message}`);
    }
  });

  bot.command('startgame', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const code = parts[1];
    if (!code) return ctx.reply('Sintassi: /startgame <CODICE>');

    try {
      const state = gameManager.startGame(code.toUpperCase());
      ctx.reply(`Partita avviata!\nStato iniziale: ${JSON.stringify(state)}`);
    } catch (err) {
      ctx.reply(`Impossibile avviare: ${err.message}`);
    }
  });

  bot.command('play', (ctx) => {
    const parts = ctx.message.text.split(' ');
    const code = parts[1];
    const val = parts[2];
    if (!code || !val) return ctx.reply('Sintassi: /play <CODICE> <VALORE_MOSSA>');

    try {
      const playerId = `tg_${ctx.from.id}`;
      const res = gameManager.executeAction(code.toUpperCase(), playerId, { value: val, index: val, optionIndex: val });
      ctx.reply(`Risultato mossa: ${res.message}`);
    } catch (err) {
      ctx.reply(`Errore mossa: ${err.message}`);
    }
  });

  bot.launch().then(() => {
    logger.info('[Certo] Telegram Bot avviato in modalità Long Polling via Tailscale');
  });

  return bot;
}

module.exports = setupBot;