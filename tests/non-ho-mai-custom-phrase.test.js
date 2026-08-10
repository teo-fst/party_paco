const test = require('node:test');
const assert = require('node:assert/strict');

const sessionManager = require('../src/core/SessionManager');
const gameRegistry = require('../src/core/GameRegistry');
const nonHoMaiGame = require('../src/games/non-ho-mai');

if (!gameRegistry.getGame(nonHoMaiGame.id)) {
    gameRegistry.registerGame(nonHoMaiGame);
}

test('non ho mai accepts player-submitted phrases and adds them to the available pool', () => {
    const session = sessionManager.createSession('non-ho-mai', {
        id: 'host-1',
        name: 'Host',
        channel: 'web'
    });

    sessionManager.joinSession(session.code, { id: 'p-2', name: 'Giocatore 2', channel: 'web' });

    const submitted = sessionManager.dispatchAction(session.code, 'p-2', 'SUBMIT_PHRASE', {
        category: 'classic',
        text: 'Ho cantato sotto la doccia in pubblico.'
    });

    assert.ok(submitted.session.gameState.customPhrases.classic.some(item => item.text.includes('cantato')));

    const nextRound = sessionManager.dispatchAction(session.code, 'host-1', 'START_GAME', { category: 'classic' });
    assert.ok(nextRound.session.gameState.currentPhrase);
});
