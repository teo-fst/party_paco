const test = require('node:test');
const assert = require('node:assert/strict');

const sessionManager = require('../src/core/SessionManager');
const database = require('../src/core/Database');
const gameRegistry = require('../src/core/GameRegistry');
const nonHoMaiGame = require('../src/games/non-ho-mai');

if (!gameRegistry.getGame(nonHoMaiGame.id)) {
    gameRegistry.registerGame(nonHoMaiGame);
}

test('leaveSession deletes the room code when the last player leaves', () => {
    const session = sessionManager.createSession('non-ho-mai', {
        id: 'player-host',
        name: 'Host',
        channel: 'web'
    });

    assert.ok(session.code);
    assert.ok(database.getSession(session.code));

    const result = sessionManager.leaveSession(session.code, 'player-host');

    assert.equal(result.session, null);
    assert.equal(sessionManager.getSession(session.code), null);
    assert.equal(database.getSession(session.code), null);
});
