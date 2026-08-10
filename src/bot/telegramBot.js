/**
 * src/bot/telegramBot.js
 * Adattatore per il Bot Telegram in Party Paco.
 * 
 * Gestisce l'interazione bidirezionale tra il Bot Telegram e il SessionManager core.
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const sessionManager = require('../core/SessionManager');
const gameRegistry = require('../core/GameRegistry');
const syncManager = require('../core/SyncManager');
const { formatWelcomeMessage, formatRoomJoinedMessage } = require('./formatters');

class TelegramBotAdapter {
  constructor() {
    this.bot = null;
    // Map per tenere traccia dei messaggi inviati per ogni stanza/chat per l'editing live
    // Map { `${chatId}_${code}`: messageId }
    this.activeMessages = new Map();
  }

  init() {
    if (!config.telegram.enabled || !config.telegram.token) {
      console.log('[TelegramBot] Bot disabilitato o Token non configurato.');
      return;
    }

    try {
      this.bot = new TelegramBot(config.telegram.token, { polling: true });
      console.log('[TelegramBot] Bot Telegram avviato in modalità Polling.');

      this._setupListeners();
      syncManager.attachTelegramAdapter(this);
    } catch (err) {
      console.error('[TelegramBot] Errore di inizializzazione:', err.message);
    }
  }

  _setupListeners() {
    if (!this.bot) return;

    // Comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, formatWelcomeMessage(), { parse_mode: 'HTML' });
    });

    // Comando /newgame
    this.bot.onText(/\/newgame/, (msg) => {
      const chatId = msg.chat.id;

      const games = gameRegistry.listGames();
      if (games.length === 0) {
        return this.bot.sendMessage(chatId, "⚠️ Nessun gioco attualmente registrato.");
      }

      // Prepara una tastiera inline per la scelta del gioco
      const buttons = games.map(g => ([
        { text: `🎮 ${g.name}`, callback_data: `creategame:${g.id}` }
      ]));

      this.bot.sendMessage(chatId, "<b>Scegli il gioco da avviare:</b>", {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
      });
    });

    // Comando /join <code>
    this.bot.onText(/\/join(?:\s+(\w+))?/, (msg, match) => {
      const chatId = msg.chat.id;
      const code = match[1] ? match[1].trim().toUpperCase() : null;

      if (!code) {
        return this.bot.sendMessage(chatId, "⚠️ Per favore specifica il codice della stanza. Esempio: <code>/join A7B9X2</code>", { parse_mode: 'HTML' });
      }

      try {
        const userName = msg.from.first_name || 'Utente Telegram';
        const playerData = {
          id: `tg_${msg.from.id}`,
          name: userName,
          channel: 'telegram',
          telegramChatId: chatId
        };

        const { session, player } = sessionManager.joinSession(code, playerData);

        this.bot.sendMessage(chatId, formatRoomJoinedMessage(session, player), { parse_mode: 'HTML' });

        // Sincronizza ed invia la vista di gioco
        syncManager.broadcastSessionState(session);
      } catch (err) {
        this.bot.sendMessage(chatId, `❌ ${err.message}`);
      }
    });

    // Comando /leave <code?>
    this.bot.onText(/\/leave(?:\s+(\w+))?/, (msg, match) => {
      const chatId = msg.chat.id;
      const playerId = `tg_${msg.from.id}`;
      const inputCode = match[1] ? match[1].trim().toUpperCase() : null;

      // Trova la stanza attiva dell'utente se il codice non è specificato
      let targetCode = inputCode;
      if (!targetCode) {
        for (const [key] of this.activeMessages.entries()) {
          if (key.startsWith(`${chatId}_`)) {
            targetCode = key.split('_')[1];
            break;
          }
        }
      }

      if (!targetCode) {
        return this.bot.sendMessage(chatId, "⚠️ Non risulti in nessuna stanza attiva o non hai specificato il codice.");
      }

      try {
        const { session } = sessionManager.leaveSession(targetCode, playerId);
        this.activeMessages.delete(`${chatId}_${targetCode}`);
        this.bot.sendMessage(chatId, `🚪 Sei uscito dalla stanza <b>${targetCode}</b>.`, { parse_mode: 'HTML' });

        if (session) {
          syncManager.broadcastSessionState(session);
        }
      } catch (err) {
        this.bot.sendMessage(chatId, `❌ ${err.message}`);
      }
    });

    // Gestione Callback Queries (Click sui pulsanti inline)
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;

      try {
        if (data.startsWith('creategame:')) {
          const gameId = data.split(':')[1];
          const hostPlayer = {
            id: `tg_${query.from.id}`,
            name: query.from.first_name || 'Host Telegram',
            channel: 'telegram',
            telegramChatId: chatId
          };

          const session = sessionManager.createSession(gameId, hostPlayer);
          await this.bot.answerCallbackQuery(query.id, { text: `Stanza ${session.code} creata!` });

          const view = this.renderGameView(session);
          const sentMsg = await this.bot.sendMessage(chatId, view.text, {
            parse_mode: 'HTML',
            reply_markup: view.reply_markup
          });

          this.activeMessages.set(`${chatId}_${session.code}`, sentMsg.message_id);
          syncManager.broadcastSessionState(session);
        } else if (data.startsWith('leave:')) {
          const code = data.split(':')[1];
          const playerId = `tg_${query.from.id}`;

          const { session } = sessionManager.leaveSession(code, playerId);
          this.activeMessages.delete(`${chatId}_${code}`);

          await this.bot.answerCallbackQuery(query.id, { text: `Sei uscito dalla stanza ${code}` });
          await this.bot.sendMessage(chatId, `🚪 Sei uscito dalla stanza <b>${code}</b>.`, { parse_mode: 'HTML' });

          if (session) {
            syncManager.broadcastSessionState(session);
          }
        } else if (data.startsWith('vote:')) {
          // Formato: vote:VALUE:CODE (es. vote:DONE:A7B9X2)
          const [, voteValue, code] = data.split(':');
          const playerId = `tg_${query.from.id}`;

          const { session } = sessionManager.dispatchAction(code, playerId, 'VOTE', { vote: voteValue });
          await this.bot.answerCallbackQuery(query.id, { text: `Voto registrato!` });

          syncManager.broadcastSessionState(session);
        } else if (data.startsWith('action:')) {
          // Formato: action:ACTION_NAME:CODE (es. action:START_GAME:A7B9X2)
          const [, actionName, code] = data.split(':');
          const playerId = `tg_${query.from.id}`;

          const { session } = sessionManager.dispatchAction(code, playerId, actionName, {});
          await this.bot.answerCallbackQuery(query.id, { text: `Azione eseguita!` });

          syncManager.broadcastSessionState(session);
        }
      } catch (err) {
        console.error('[TelegramBot] Errore callback:', err.message);
        this.bot.answerCallbackQuery(query.id, { text: `⚠️ ${err.message}`, show_alert: true });
      }
    });
  }

  /**
   * Genera la vista Telegram interrogando il contratto del modulo gioco.
   */
  renderGameView(session) {
    const game = gameRegistry.getGame(session.gameId);
    if (!game) {
      return { text: `Stanza: ${session.code}`, reply_markup: { inline_keyboard: [] } };
    }
    return game.renderTelegramView(session);
  }

  /**
   * Aggiorna in tempo reale i messaggi Telegram per i partecipanti.
   */
  async syncTelegramViews(session) {
    if (!this.bot) return;

    const view = this.renderGameView(session);

    for (const p of session.players) {
      if (p.channel === 'telegram' && p.telegramChatId) {
        const key = `${p.telegramChatId}_${session.code}`;
        const msgId = this.activeMessages.get(key);

        try {
          if (msgId) {
            await this.bot.editMessageText(view.text, {
              chat_id: p.telegramChatId,
              message_id: msgId,
              parse_mode: 'HTML',
              reply_markup: view.reply_markup
            });
          } else {
            const sentMsg = await this.bot.sendMessage(p.telegramChatId, view.text, {
              parse_mode: 'HTML',
              reply_markup: view.reply_markup
            });
            this.activeMessages.set(key, sentMsg.message_id);
          }
        } catch (err) {
          // Ignora se il messaggio non ha subito modifiche di testo o layout
        }
      }
    }
  }
}

module.exports = new TelegramBotAdapter();
