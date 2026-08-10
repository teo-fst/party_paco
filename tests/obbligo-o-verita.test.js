const test = require('node:test');
const assert = require('node:assert/strict');

const sessionManager = require('../src/core/SessionManager');
const gameRegistry = require('../src/core/GameRegistry');
const obbligoOVeritaGame = require('../src/games/obbligo-o-verita');

if (!gameRegistry.getGame(obbligoOVeritaGame.id)) {
    gameRegistry.registerGame(obbligoOVeritaGame);
}

test('obbligo o verità generates a prompt when the game starts', () => {
    const session = sessionManager.createSession('obbligo-o-verita', {
        id: 'player-host',
        name: 'Host',
        channel: 'web'
    });

    const result = sessionManager.dispatchAction(session.code, 'player-host', 'START_GAME', {
        category: 'verita'
    });

    assert.equal(session.status, 'PLAYING');
    assert.ok(result.session.gameState.currentPrompt);
    assert.ok(['VERITA', 'OBBLIGO'].includes(result.session.gameState.currentPrompt.kind));
    assert.ok(result.session.gameState.currentPrompt.text.length > 0);
});
