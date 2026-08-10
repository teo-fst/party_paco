const test = require('node:test');
const assert = require('node:assert/strict');

const sessionManager = require('../src/core/SessionManager');
const gameRegistry = require('../src/core/GameRegistry');
const impostoreGame = require('../src/games/impostore');

if (!gameRegistry.getGame(impostoreGame.id)) {
    gameRegistry.registerGame(impostoreGame);
}

test('impostore cannot assign the impostor as the starter and gives helper word only to the impostor', () => {
    const session = sessionManager.createSession('impostore', {
        id: 'host-1',
        name: 'Host',
        channel: 'web'
    });

    sessionManager.joinSession(session.code, { id: 'p-2', name: 'Giocatore 2', channel: 'web' });
    sessionManager.joinSession(session.code, { id: 'p-3', name: 'Giocatore 3', channel: 'web' });

    const result = sessionManager.dispatchAction(session.code, 'host-1', 'START_GAME', {});
    const state = result.session.gameState;

    assert.equal(state.phase, 'ROUND_ACTIVE');
    assert.equal(state.currentTurnPlayerId, 'host-1');
    assert.ok(state.secretWord);
    assert.ok(state.helperWord);
    assert.notEqual(state.impostorId, 'host-1');

    const impostorView = impostoreGame.getPublicState(result.session, state.impostorId);
    assert.equal(impostorView.secretWord, state.secretWord);
    assert.equal(impostorView.helperWord, state.helperWord);

    const nonImpostorId = result.session.players.find(
        p => p.id !== state.impostorId && p.id !== state.currentTurnPlayerId
    )?.id;

    assert.ok(nonImpostorId);
    const nonImpostorView = impostoreGame.getPublicState(result.session, nonImpostorId);
    assert.equal(nonImpostorView.secretWord, undefined);
    assert.equal(nonImpostorView.helperWord, undefined);
});
