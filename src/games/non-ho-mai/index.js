/**
 * src/games/non-ho-mai/index.js
 * Modulo Gioco "Non Ho Mai" - Primo esempio pluggable del framework Party Paco.
 * 
 * Implementa l'interfaccia GameInterface ed integra il caricamento dei pool e il rendering Telegram.
 */

const path = require('path');
const GameInterface = require('../../core/GameInterface');
const contentPoolManager = require('../../core/ContentPoolManager');
const { NonHoMaiLogic } = require('./logic');

class NonHoMaiGame extends GameInterface {
  constructor() {
    super();
    this.initPools();
  }

  get id() {
    return 'non-ho-mai';
  }

  get name() {
    return 'Non Ho Mai';
  }

  get description() {
    return 'Il classico gioco di carte e verità dove si vota se si è mai compiuta un\'azione!';
  }

  get minPlayers() {
    return 1; // Può essere giocato anche da soli per test, ideale 2+
  }

  initPools() {
    const baseContentDir = path.join(__dirname, 'content');
    contentPoolManager.loadPoolFromFile(this.id, 'classic', path.join(baseContentDir, 'classic.json'));
    contentPoolManager.loadPoolFromFile(this.id, 'party', path.join(baseContentDir, 'party.json'));
    contentPoolManager.loadPoolFromFile(this.id, 'spicy', path.join(baseContentDir, 'spicy.json'));
  }

  initGameState(session, options = {}) {
    return NonHoMaiLogic.createInitialState(session, options);
  }

  handleAction(session, player, action, payload = {}) {
    return NonHoMaiLogic.handleAction(session.gameState, session, player, action, payload);
  }

  getPublicState(session, playerId = null) {
    const state = session.gameState || {};
    const categories = contentPoolManager.getCategories(this.id);
    return {
      ...state,
      availableCategories: categories
    };
  }

  renderTelegramView(session) {
    const state = session.gameState || {};
    const phrase = state.currentPhrase ? state.currentPhrase.text : 'Premi per iniziare!';
    const round = state.roundNumber || 0;

    let text = `🍷 <b>NON HO MAI</b> (Stanza: <code>${session.code}</code>)\n`;
    text += `Turno #${round} | Categoria: <b>${state.selectedCategory || 'classic'}</b>\n\n`;

    if (state.phase === 'VOTING') {
      text += `❓ <i>"Non ho mai... ${phrase}"</i>\n\n`;
      const votedCount = state.voting ? Object.keys(state.voting.votes).length : 0;
      const totalCount = session.players.length;
      text += `📊 Voti registrati: <b>${votedCount}/${totalCount}</b>`;

      return {
        text,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🙋‍♂️ L\'ho fatto!', callback_data: `vote:DONE:${session.code}` },
              { text: '😇 Mai fatto', callback_data: `vote:NEVER:${session.code}` }
            ],
            [
              { text: '⏭️ Prossima Frase', callback_data: `action:NEXT_ROUND:${session.code}` }
            ],
            [
              { text: '🚪 Esci dalla Stanza', callback_data: `leave:${session.code}` }
            ]
          ]
        }
      };
    } else if (state.phase === 'ROUND_SUMMARY') {
      text += `📜 <b>Risultati della frase:</b>\n<i>"${phrase}"</i>\n\n`;
      const votes = state.voting ? state.voting.votes : {};
      
      for (const p of session.players) {
        const v = votes[p.id];
        const symbol = v === 'DONE' ? '🙋‍♂️ L\'ha fatto!' : v === 'NEVER' ? '😇 Mai fatto' : '⏳ Non votato';
        text += `- <b>${p.name}</b>: ${symbol}\n`;
      }

      return {
        text,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➡️ Prossimo Turno', callback_data: `action:NEXT_ROUND:${session.code}` }
            ],
            [
              { text: '🚪 Esci dalla Stanza', callback_data: `leave:${session.code}` }
            ]
          ]
        }
      };
    }

    // Default Lobby/Category Select
    text += `Scegli la categoria ed estrai la prima frase!`;
    return {
      text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎲 Inizia Gioco', callback_data: `action:START_GAME:${session.code}` }
          ],
          [
            { text: '🚪 Esci dalla Stanza', callback_data: `leave:${session.code}` }
          ]
        ]
      }
    };
  }
}

module.exports = new NonHoMaiGame();
