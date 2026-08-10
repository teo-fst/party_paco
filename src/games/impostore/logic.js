/**
 * src/games/impostore/logic.js
 * Logica di gioco per "Impostore".
 */

const SECRET_WORDS = [
    'gatto', 'mare', 'albero', 'pasta', 'sedia', 'casa', 'spiaggia', 'libro',
    'pianoforte', 'telefono', 'montagna', 'fiore', 'pizza', 'computer', 'bicchiere', 'stella'
];

const HELPER_WORDS = {
    gatto: 'animale domestico',
    mare: 'costa e onde',
    albero: 'ha rami e foglie',
    pasta: 'si cucina con acqua e condimento',
    sedia: 'si siede sopra',
    casa: 'luogo dove dormi',
    spiaggia: 'si trova vicino al mare',
    libro: 'ha pagine e storie',
    pianoforte: 'strumento musicale con tasti',
    telefono: 'serve per chiamare',
    montagna: 'è molto alta',
    fiore: 'sboccia in primavera',
    pizza: 'piatto tipico rotondo',
    computer: 'serve per lavorare e navigare',
    bicchiere: 'contiene liquidi',
    stella: 'si vede di notte'
};

class ImpostoreLogic {
    static createInitialState(session, options = {}) {
        if (!session || !session.players || session.players.length === 0) {
            throw new Error('Impostore richiede almeno un giocatore per iniziare la sessione.');
        }

        return {
            phase: 'WAITING',
            round: 0,
            impostorId: null,
            currentTurnPlayerId: session.players[0]?.id || null,
            secretWord: null,
            helperWord: null,
            usedWords: [],
            lastHint: null,
            startedByImpostor: false
        };
    }

    static handleAction(gameState, session, player, action, payload = {}) {
        const updatedState = { ...gameState };
        const events = [];

        switch (action) {
            case 'START_GAME': {
                if ((session.players || []).length < 3) {
                    throw new Error('Impostore richiede almeno 3 giocatori per iniziare la partita.');
                }

                const eligiblePlayers = session.players.filter(p => p.id !== player.id);
                if (eligiblePlayers.length === 0) {
                    throw new Error('Non è possibile assegnare un impostore con un solo giocatore attivo.');
                }

                const impostor = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
                const secretWord = this.pickWord(updatedState.usedWords || []);

                updatedState.phase = 'ROUND_ACTIVE';
                updatedState.round = 1;
                updatedState.impostorId = impostor.id;
                updatedState.currentTurnPlayerId = player.id;
                updatedState.secretWord = secretWord;
                updatedState.helperWord = HELPER_WORDS[secretWord] || 'indizio generico';
                updatedState.usedWords = [...(updatedState.usedWords || []), secretWord];
                updatedState.startedByImpostor = false;
                updatedState.lastHint = payload.hint || null;

                events.push({ type: 'ROUND_STARTED', playerId: player.id, impostorId: impostor.id, helperWord: updatedState.helperWord });
                break;
            }

            case 'NEXT_ROUND': {
                const players = session.players || [];
                if (players.length < 3) {
                    throw new Error('Impostore richiede almeno 3 giocatori.');
                }

                const currentIndex = players.findIndex(p => p.id === updatedState.currentTurnPlayerId);
                const nextPlayer = players[(currentIndex + 1) % players.length] || players[0];

                if (nextPlayer.id === updatedState.impostorId) {
                    throw new Error("L'impostore non può iniziare per primo.");
                }

                const nextWord = this.pickWord(updatedState.usedWords || []);
                const nextImpostor = players.filter(p => p.id !== nextPlayer.id)[Math.floor(Math.random() * (players.length - 1))];

                updatedState.round += 1;
                updatedState.currentTurnPlayerId = nextPlayer.id;
                updatedState.phase = 'ROUND_ACTIVE';
                updatedState.impostorId = nextImpostor.id;
                updatedState.secretWord = nextWord;
                updatedState.helperWord = HELPER_WORDS[nextWord] || 'indizio generico';
                updatedState.usedWords = [...(updatedState.usedWords || []), nextWord];
                updatedState.lastHint = payload.hint || null;
                updatedState.startedByImpostor = false;

                events.push({ type: 'ROUND_ADVANCED', playerId: nextPlayer.id, impostorId: nextImpostor.id, helperWord: updatedState.helperWord });
                break;
            }

            case 'REVEAL_SECRET': {
                if (player.id !== updatedState.impostorId) {
                    throw new Error("Solo l'impostore può vedere la parola segreta.");
                }

                updatedState.phase = 'WORD_REVEALED';
                events.push({ type: 'WORD_REVEALED', word: updatedState.secretWord });
                break;
            }

            default:
                throw new Error(`Azione non riconosciuta per Impostore: '${action}'`);
        }

        return { updatedState, events };
    }

    static pickWord(usedWords = []) {
        const availableWords = SECRET_WORDS.filter(word => !usedWords.includes(word));
        const source = availableWords.length > 0 ? availableWords : SECRET_WORDS;
        const randomIndex = Math.floor(Math.random() * source.length);
        return source[randomIndex];
    }
}

module.exports = { ImpostoreLogic };
