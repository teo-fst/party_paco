/**
 * src/games/obbligo-o-verita/index.js
 * Modulo Gioco "Obbligo o Verità" per Party Paco.
 */

const path = require('path');
const GameInterface = require('../../core/GameInterface');
const contentPoolManager = require('../../core/ContentPoolManager');
const { ObbligoOVeritaLogic } = require('./logic');

class ObbligoOVeritaGame extends GameInterface {
    constructor() {
        super();
        this.initPools();
    }

    get id() {
        return 'obbligo-o-verita';
    }

    get name() {
        return 'Obbligo o Verità';
    }

    get description() {
        return 'Un gioco di domande spinte: ogni turno un giocatore sceglie se rispondere con verità o eseguire un obbligo.';
    }

    get minPlayers() {
        return 2;
    }

    initPools() {
        const baseContentDir = path.join(__dirname, 'content');
        contentPoolManager.loadPoolFromFile(this.id, 'verita', path.join(baseContentDir, 'verita.json'));
        contentPoolManager.loadPoolFromFile(this.id, 'obbligo', path.join(baseContentDir, 'obbligo.json'));
    }

    initGameState(session, options = {}) {
        return ObbligoOVeritaLogic.createInitialState(session, options);
    }

    handleAction(session, player, action, payload = {}) {
        return ObbligoOVeritaLogic.handleAction(session.gameState, session, player, action, payload);
    }

    getPublicState(session, playerId = null) {
        return session.gameState || {};
    }

    renderTelegramView(session) {
        const state = session.gameState || {};
        const prompt = state.currentPrompt ? state.currentPrompt.text : 'Premi per generare un prompt!';
        const currentPlayer = state.currentPlayerId ? session.players.find(p => p.id === state.currentPlayerId) : null;

        return {
            text: `🎭 <b>OBBLIGO O VERITÀ</b> (Stanza: <code>${session.code}</code>)\n` +
                `${currentPlayer ? `Turno di <b>${currentPlayer.name}</b>\n` : ''}` +
                `Prompt: <i>${prompt}</i>`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Verità', callback_data: `action:CHOOSE_KIND:${session.code}:VERITA` },
                        { text: '🔥 Obbligo', callback_data: `action:CHOOSE_KIND:${session.code}:OBBLIGO` }
                    ],
                    [
                        { text: '➡️ Prossimo turno', callback_data: `action:NEXT_TURN:${session.code}` }
                    ],
                    [
                        { text: '🚪 Esci dalla Stanza', callback_data: `leave:${session.code}` }
                    ]
                ]
            }
        };
    }
}

module.exports = new ObbligoOVeritaGame();
