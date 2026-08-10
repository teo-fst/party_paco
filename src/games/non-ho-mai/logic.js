/**
 * src/games/non-ho-mai/logic.js
 * Logica e State Machine per il gioco "Non Ho Mai".
 */

const contentPoolManager = require('../../core/ContentPoolManager');
const ConsensusEngine = require('../../core/ConsensusEngine');

const STATES = {
  CATEGORY_SELECT: 'CATEGORY_SELECT',
  VOTING: 'VOTING',
  ROUND_SUMMARY: 'ROUND_SUMMARY'
};

class NonHoMaiLogic {
  /**
   * Inizializza lo stato iniziale del gioco "Non Ho Mai".
   */
  static createInitialState(session, options = {}) {
    return {
      phase: STATES.CATEGORY_SELECT,
      selectedCategory: options.category || 'classic',
      currentPhrase: null,
      usedPhraseIds: [],
      roundNumber: 0,
      voting: null,
      playerStats: {},
      customPhrases: {
        classic: [],
        party: [],
        spicy: []
      }
    };
  }

  /**
   * Gestisce le azioni di gioco per "Non Ho Mai".
   */
  static handleAction(gameState, session, player, action, payload) {
    let updatedState = { ...gameState };
    const events = [];

    switch (action) {
      case 'SET_CATEGORY': {
        if (!player.isHost && session.players.length > 1) {
          throw new Error("Solo l'host può modificare la categoria.");
        }
        updatedState.selectedCategory = payload.category || 'classic';
        break;
      }

      case 'SUBMIT_PHRASE': {
        const phraseText = String(payload.text || '').trim();
        const category = String(payload.category || updatedState.selectedCategory || 'classic').trim();

        if (!phraseText) {
          throw new Error('La frase proposta non può essere vuota.');
        }

        if (phraseText.length < 4) {
          throw new Error('La frase proposta è troppo breve.');
        }

        if (!updatedState.customPhrases) {
          updatedState.customPhrases = { classic: [], party: [], spicy: [] };
        }

        if (!updatedState.customPhrases[category]) {
          updatedState.customPhrases[category] = [];
        }

        const phraseItem = {
          id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          text: phraseText,
          category,
          createdBy: player.id,
          createdAt: Date.now()
        };

        updatedState.customPhrases[category].push(phraseItem);
        events.push({ type: 'CUSTOM_PHRASE_SUBMITTED', phrase: phraseItem });
        break;
      }

      case 'START_GAME':
      case 'NEXT_ROUND': {
        if (session.status !== 'PLAYING') {
          session.status = 'PLAYING';
        }

        const category = payload.category || updatedState.selectedCategory || 'classic';
        const customPool = updatedState.customPhrases?.[category] || [];
        const allPoolItems = [
          ...contentPoolManager.pools.get('non-ho-mai')?.get(category) || [],
          ...customPool
        ];

        const available = allPoolItems.filter(item => !updatedState.usedPhraseIds.includes(item.id));
        const phraseItem = available[Math.floor(Math.random() * available.length)] || null;

        if (!phraseItem) {
          throw new Error("Tutte le frasi della categoria selezionata sono state completate!");
        }

        updatedState.phase = STATES.VOTING;
        updatedState.selectedCategory = category;
        updatedState.currentPhrase = phraseItem;
        updatedState.usedPhraseIds.push(phraseItem.id);
        updatedState.roundNumber += 1;

        // Inizializza lo stato di votazione per tutti i giocatori attivi nella stanza
        const activePlayerIds = session.players.map(p => p.id);
        updatedState.voting = ConsensusEngine.createVoteState(activePlayerIds, { allowChange: true });

        events.push({ type: 'PHRASE_DRAWN', phrase: phraseItem });
        break;
      }

      case 'VOTE': {
        if (updatedState.phase !== STATES.VOTING) {
          throw new Error("Non è attiva alcuna votazione in questo momento.");
        }

        const voteValue = payload.vote; // 'DONE' ('L\'ho fatto') oppure 'NEVER' ('Mai fatto')
        if (voteValue !== 'DONE' && voteValue !== 'NEVER') {
          throw new Error("Valore di voto non valido. Usa 'DONE' o 'NEVER'.");
        }

        const { updatedState: newVoteState, isNewlyCompleted } = ConsensusEngine.submitVote(
          updatedState.voting,
          player.id,
          voteValue
        );

        updatedState.voting = newVoteState;

        // Aggiorna le statistiche individuali del giocatore
        if (!updatedState.playerStats[player.id]) {
          updatedState.playerStats[player.id] = { doneCount: 0, neverCount: 0 };
        }
        if (voteValue === 'DONE') {
          updatedState.playerStats[player.id].doneCount += 1;
        } else {
          updatedState.playerStats[player.id].neverCount += 1;
        }

        // Se tutti i giocatori hanno votato, transiziona automaticamente a ROUND_SUMMARY
        if (isNewlyCompleted || updatedState.voting.isCompleted) {
          updatedState.phase = STATES.ROUND_SUMMARY;
          events.push({ type: 'ROUND_COMPLETED', summary: updatedState.voting.summary });
        }
        break;
      }

      case 'SKIP_ROUND': {
        if (!player.isHost) {
          throw new Error("Solo l'host può saltare il turno.");
        }
        updatedState.phase = STATES.ROUND_SUMMARY;
        break;
      }

      default:
        throw new Error(`Azione non riconosciuta per Non Ho Mai: '${action}'`);
    }

    return { updatedState, events };
  }
}

module.exports = { NonHoMaiLogic, STATES };
