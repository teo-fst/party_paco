/**
 * src/core/ConsensusEngine.js
 * Engine astratto per la gestione di votazioni, consensi e conteggi in tempo reale.
 * 
 * Permette a qualsiasi modulo gioco di creare una fase di votazione,
 * monitorare le risposte dei giocatori ed evidenziare quando la fase è completata.
 */

class ConsensusEngine {
  /**
   * Inizializza un nuovo stato di votazione/consenso.
   * 
   * @param {Array<string>} targetPlayerIds ID dei giocatori attesi al voto
   * @param {Object} options Configurazione aggiuntiva (es. { allowChange: false, timeoutMs: 30000 })
   * @returns {Object} Oggetto stato della votazione
   */
  static createVoteState(targetPlayerIds = [], options = {}) {
    return {
      targetPlayerIds,
      votes: {}, // Map { playerId: voteValue }
      isCompleted: false,
      startedAt: Date.now(),
      allowChange: options.allowChange ?? false,
      summary: null
    };
  }

  /**
   * Registra un voto da parte di un giocatore.
   * 
   * @param {Object} voteState Stato corrente restituito da createVoteState
   * @param {string} playerId ID del giocatore votante
   * @param {*} voteValue Valore del voto (es. 'YES', 'NO', 1, 2, 'player_id_target')
   * @returns {{ updatedState: Object, isNewlyCompleted: boolean }}
   */
  static submitVote(voteState, playerId, voteValue) {
    if (voteState.isCompleted && !voteState.allowChange) {
      return { updatedState: voteState, isNewlyCompleted: false };
    }

    // Se il giocatore non faceva parte dei target ma partecipa, aggiungilo dinamicamente
    if (!voteState.targetPlayerIds.includes(playerId)) {
      voteState.targetPlayerIds.push(playerId);
    }

    // Registra il voto
    voteState.votes[playerId] = voteValue;

    // Verifica se tutti i giocatori target hanno votato
    const totalExpected = voteState.targetPlayerIds.length;
    const totalVoted = Object.keys(voteState.votes).length;

    const isNewlyCompleted = totalVoted >= totalExpected && !voteState.isCompleted;

    if (totalVoted >= totalExpected) {
      voteState.isCompleted = true;
      voteState.summary = this.calculateSummary(voteState.votes);
    }

    return { updatedState: voteState, isNewlyCompleted };
  }

  /**
   * Calcola il riepilogo statistico dei voti per opzione.
   * 
   * @param {Object} votes Map { playerId: voteValue }
   * @returns {Object} Map { optionValue: count } e percentuali
   */
  static calculateSummary(votes) {
    const counts = {};
    const totalVotes = Object.keys(votes).length;

    for (const [playerId, val] of Object.entries(votes)) {
      counts[val] = (counts[val] || 0) + 1;
    }

    const percentages = {};
    for (const [opt, count] of Object.entries(counts)) {
      percentages[opt] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    }

    return {
      counts,
      percentages,
      totalVotes
    };
  }
}

module.exports = ConsensusEngine;
