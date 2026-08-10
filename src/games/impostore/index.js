/**
 * src/games/impostore/index.js
 * Modulo Gioco "Impostore" per Party Paco.
 */

const GameInterface = require('../../core/GameInterface');
const { ImpostoreLogic } = require('./logic');

class ImpostoreGame extends GameInterface {
    constructor() {
        super();
    }

    get id() {
        return 'impostore';
    }

    get name() {
        return 'Impostore';
    }

    get description() {
        return 'Un giocatore è l\'impostore: deve indovinare la parola segreta dalla parola di aiuto, senza poter iniziare per primo.';
    }

    get minPlayers() {
        return 3;
    }

    initGameState(session, options = {}) {
        return ImpostoreLogic.createInitialState(session, options);
    }

    handleAction(session, player, action, payload = {}) {
        return ImpostoreLogic.handleAction(session.gameState, session, player, action, payload);
    }

    getPublicState(session, playerId = null) {
        const state = session.gameState || {};
        const publicState = { ...state };

        if (state.impostorId && playerId && playerId === state.impostorId) {
            publicState.secretWord = state.secretWord;
            publicState.helperWord = state.helperWord;
            return publicState;
        }

        delete publicState.secretWord;
        delete publicState.helperWord;
        delete publicState.impostorId;
        return publicState;
    }

    renderTelegramView(session) {
        const state = session.gameState || {};
        const currentPlayer = session.players.find(p => p.id === state.currentTurnPlayerId);
        const impostor = session.players.find(p => p.id === state.impostorId);

        const text = `🕵️ <b>IMPOSTORE</b> (Stanza: <code>${session.code}</code>)\n` +
            `${currentPlayer ? `Turno di <b>${currentPlayer.name}</b>\n` : ''}` +
            `${impostor ? `Impostore: <b>${impostor.name}</b>\n` : ''}` +
            `${state.secretWord ? `Parola segreta: <b>${state.secretWord}</b>\n` : ''}` +
            `${state.helperWord ? `Aiuto: <b>${state.helperWord}</b>` : ''}`;

        return {
            text,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🎲 Nuovo round', callback_data: `action:NEXT_ROUND:${session.code}` }
                    ],
                    [
                        { text: '🚪 Esci dalla Stanza', callback_data: `leave:${session.code}` }
                    ]
                ]
            }
        };
    }
}

module.exports = new ImpostoreGame();
