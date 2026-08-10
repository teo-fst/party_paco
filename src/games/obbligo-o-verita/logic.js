/**
 * src/games/obbligo-o-verita/logic.js
 * Logica di gioco per "Obbligo o Verità".
 */

const contentPoolManager = require('../../core/ContentPoolManager');

const PHASES = {
    WAITING: 'WAITING',
    CHOOSING: 'CHOOSING',
    REVEAL: 'REVEAL'
};

class ObbligoOVeritaLogic {
    static createInitialState(session, options = {}) {
        return {
            phase: PHASES.WAITING,
            currentPrompt: null,
            currentPlayerId: session.players[0]?.id || null,
            playerOrder: session.players.map(p => p.id),
            usedPromptIds: [],
            deckType: options.category || 'mixed',
            round: 0,
            lastChoice: null
        };
    }

    static handleAction(gameState, session, player, action, payload = {}) {
        let updatedState = { ...gameState };
        const events = [];

        switch (action) {
            case 'START_GAME': {
                session.status = 'PLAYING';
                updatedState.phase = PHASES.CHOOSING;
                updatedState.round += 1;
                updatedState.currentPlayerId = player.id;
                updatedState.currentPrompt = this.drawPrompt(updatedState, payload.category || updatedState.deckType || 'mixed');
                events.push({ type: 'PROMPT_GENERATED', prompt: updatedState.currentPrompt });
                break;
            }

            case 'CHOOSE_KIND': {
                const kind = payload.kind || 'VERITA';
                if (!['VERITA', 'OBBLIGO'].includes(kind)) {
                    throw new Error("Tipo non valido. Usa 'VERITA' o 'OBBLIGO'.");
                }

                const prompt = updatedState.currentPrompt;
                if (!prompt) {
                    throw new Error('Nessun prompt attivo. Avvia un nuovo turno prima di scegliere.');
                }

                updatedState.phase = PHASES.REVEAL;
                updatedState.lastChoice = kind;
                updatedState.currentPrompt = {
                    ...prompt,
                    kind,
                    text: `${kind === 'VERITA' ? 'VERITÀ' : 'OBBLIGO'}: ${prompt.text}`
                };

                events.push({ type: 'PROMPT_REVEALED', prompt: updatedState.currentPrompt });
                break;
            }

            case 'NEXT_TURN': {
                const players = session.players || [];
                if (players.length === 0) {
                    throw new Error('La stanza non contiene giocatori.');
                }

                const currentIndex = players.findIndex(p => p.id === updatedState.currentPlayerId);
                const nextPlayer = players[(currentIndex + 1) % players.length] || players[0];
                updatedState.currentPlayerId = nextPlayer.id;
                updatedState.phase = PHASES.CHOOSING;
                updatedState.round += 1;
                updatedState.currentPrompt = this.drawPrompt(updatedState, payload.category || updatedState.deckType || 'mixed');
                updatedState.lastChoice = null;
                events.push({ type: 'NEXT_TURN', playerId: nextPlayer.id, prompt: updatedState.currentPrompt });
                break;
            }

            default:
                throw new Error(`Azione non riconosciuta per Obbligo o Verità: '${action}'`);
        }

        return { updatedState, events };
    }

    static drawPrompt(state, category = 'mixed') {
        const selectedCategory = category === 'mixed' ? ['verita', 'obbligo'][Math.floor(Math.random() * 2)] : category;
        const draw = contentPoolManager.drawRandomItem('obbligo-o-verita', selectedCategory, state.usedPromptIds || []);

        if (!draw) {
            return {
                id: `reset_${Date.now()}`,
                kind: selectedCategory === 'verita' ? 'VERITA' : 'OBBLIGO',
                text: selectedCategory === 'verita'
                    ? 'Dì a tutti il tuo più grande segreto.'
                    : 'Fai una cosa imbarazzante per 10 secondi.'
            };
        }

        const kind = selectedCategory === 'verita' ? 'VERITA' : 'OBBLIGO';
        return {
            id: draw.id,
            kind,
            text: draw.text
        };
    }
}

module.exports = { ObbligoOVeritaLogic, PHASES };
