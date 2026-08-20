class TruthOrDareGame {
  constructor(session) {
    this.session = session;
    this.state = {};
    
    this.presets = {
      truth: {
        divertenti: [
          "Qual è la ricerca più strana che hai fatto su Google di recente?",
          "Qual è la canzone 'vergognosa' che ascolti in segreto?",
          "Hai mai finto di essere malato per evitare un impegno?",
          "Se potessi scambiare la tua vita con un personaggio dei cartoni, chi sceglieresti?",
          "Qual è il cibo più strano che combinazione preferisci mangiare?",
          "Sei mai caduto in pubblico cercando di fare il figo?"
        ],
        imbarazzanti: [
          "Qual è stata la figuraccia più grande che hai fatto in pubblico?",
          "Hai mai inviato un messaggio alla persona sbagliata per errore? Cosa diceva?",
          "Qual è la cosa più strana che hai mangiato da solo a casa?",
          "Hai mai risposto 'anche a te' a qualcuno che ti diceva 'buon compleanno'?",
          "Qual è la cosa più imbarazzante che i tuoi genitori ti abbiano mai visto fare?",
          "Hai mai finto di conoscere una persona famosa solo per far colpo?"
        ],
        segreti: [
          "Qual è un talento inutile che possiedi e di cui ti vergogni un po'?",
          "Qual è la bugia più grande che hai raccontato ai tuoi genitori?",
          "Cosa faresti per primo se fossi invisibile per un'ora intera?",
          "Qual è una fobia assurda che non hai mai confessato a nessuno?",
          "Hai mai spiazzato qualcuno spiando il suo profilo sui social?"
        ],
        scuola: [
          "Hai mai copiato spudoratamente durante un compito in classe?",
          "Qual è la scusa più assurda che hai usato per non aver fatto i compiti?",
          "Qual è la materia scolastica in cui sei sempre stato un disastro?",
          "Hai mai preso una nota sul registro e come l'hai giustificata a casa?",
          "Qual è il professore che ti ha fatto più innervosire in assoluto?",
          "Se potessi eliminare una materia dal calendario scolastico, quale sarebbe?"
        ],
        spicy: [
          "Qual è stata la tua primissima cotta celebre (celebrity crush)?",
          "Hai mai avuto una cotta per il fratello o la sorella di un tuo amico?",
          "Qual è il difetto che proprio non sopporti in una persona quando flirti?",
          "Hai mai inviato un messaggio romantico e poi te ne sei pentito un secondo dopo?",
          "Qual è la frase di rimorchio più ridicola che hai mai sentito o usato?",
          "Chi è stata la prima persona che ti ha fatto battere il cuore?"
        ],
        amicizia: [
          "Qual è stata la tua primissima impressione su chi si trova in questa stanza?",
          "Chi tra i presenti porteresti con te su un'isola deserta?",
          "Qual è il ricordo più divertente che hai vissuto con questo gruppo?"
        ]
      },
      dare: {
        divertenti: [
          "Fai l'imitazione di un personaggio famoso finché qualcuno non indovina.",
          "Parla con un accento straniero inventato per i prossimi 2 turni.",
          "Inventa uno rap all'impronta dedicato a uno dei presenti.",
          "Manda una foto con una smorfia assurda nella chat del gruppo.",
          "Fai la telecronaca ad alta voce di quello che sta facendo un altro giocatore."
        ],
        fisiche: [
          "Rimani in equilibrio su un solo piede con le mani in testa per 30 secondi.",
          "Fai 10 saltelli sul posto facendo una smorfia ad ogni salto.",
          "Mantieni una posizione da plank per 20 secondi senza cedere.",
          "Cammina a passo di granchio attorno alla stanza per un giro completo.",
          "Fai 5 flessioni dicendo 'sono fortissimo' dopo ciascuna."
        ],
        sociali: [
          "Fai un complimento sincero (ma esagerato) a ciascun giocatore nella stanza.",
          "Manda un vocale di 5 secondi ad un amico dicendo solo 'Il lama vola all'alba'.",
          "Fai finta di essere un cameriere d'alta classe e prendi le ordinazioni a tutti.",
          "Chiedi a Siri o Google un'informazione del tutto noSense a voce altissima."
        ],
        scuola: [
          "Recita una poesia d'italiano celebre con l'intonazione di un cantante trap.",
          "Fai finta di interrogare un altro giocatore spiegandogli la storia dei dinosauri.",
          "Fai la parodia del professore più severo per 30 secondi.",
          "Spiega un concetto scientifico a caso usando solo versi di animali."
        ],
        spicy: [
          "Fai un complimento poetico ed epico alla persona alla tua destra.",
          "Manda solo l'emoji di un cuore rosa a un contatto a caso della tua rubrica.",
          "Fai una dichiarazione d'amore drammatica e teatrale a un oggetto della stanza.",
          "Sussurra una frase 'misteriosa e romantica' al giocatore alla tua sinistra."
        ],
        pazze: [
          "Parla come un robot o un doppiatore di film per i prossimi 2 minuti.",
          "Canta il ritornello di una canzone a tua scelta con la bocca spalancata.",
          "Fai un discorso solenne spiegando perché la pizza va mangiata partendo dal cornicione.",
          "Inventa uno spot pubblicitario per vendere una matita usata."
        ]
      }
    };
  }

  init() {
    const playerIds = Array.from(this.session.players.keys());
    
    this.state = {
      finished: false,
      phase: 'SPINNING',
      targetPlayerId: null,
      askerPlayerId: null,
      selectedType: null, // 'truth' | 'dare'
      currentPrompt: ''
    };

    this.selectRandomTarget(playerIds);
    return this.state;
  }

  selectRandomTarget(playerIds) {
    if (playerIds.length === 0) return;
    
    const targetIdx = Math.floor(Math.random() * playerIds.length);
    this.state.targetPlayerId = playerIds[targetIdx];
    
    const otherPlayers = playerIds.filter(id => id !== this.state.targetPlayerId);
    this.state.askerPlayerId = otherPlayers.length > 0 
      ? otherPlayers[Math.floor(Math.random() * otherPlayers.length)] 
      : this.state.targetPlayerId;

    this.state.phase = 'SPINNING';
    this.state.selectedType = null;
    this.state.currentPrompt = '';
  }

  // Gestione disconnessione / uscita durante la partita
  handlePlayerLeave(playerId) {
    const remainingIds = Array.from(this.session.players.keys());

    if (remainingIds.length < 2) {
      this.state.phase = 'SPINNING';
      this.state.targetPlayerId = null;
      this.state.askerPlayerId = null;
      this.state.selectedType = null;
      this.state.currentPrompt = '';
      return;
    }

    // Se chi se n'è andato era l'estratto o chi doveva fare la domanda, riavvia l'estrazione
    if (playerId === this.state.targetPlayerId || playerId === this.state.askerPlayerId) {
      this.selectRandomTarget(remainingIds);
    }
  }

  handleAction(playerId, payload) {
    const { action, type, prompt, category } = payload;

    switch (action) {
      case 'STOP_SPINNER':
        if (this.state.phase === 'SPINNING') {
          this.state.phase = 'CHOOSING';
        }
        break;

      case 'SELECT_TYPE':
        if (playerId === this.state.targetPlayerId && this.state.phase === 'CHOOSING') {
          this.state.selectedType = type;
          this.state.phase = 'PROMPTING';
        }
        break;

      case 'SUBMIT_PROMPT':
        if (playerId === this.state.askerPlayerId && this.state.phase === 'PROMPTING') {
          this.state.currentPrompt = prompt;
          this.state.phase = 'ANSWERING';
        }
        break;

      case 'GET_PRESET':
        if (playerId === this.state.askerPlayerId && this.state.phase === 'PROMPTING') {
          const typeList = this.presets[this.state.selectedType];
          if (typeList && typeList[category]) {
            const list = typeList[category];
            this.state.currentPrompt = list[Math.floor(Math.random() * list.length)];
            this.state.phase = 'ANSWERING';
          }
        }
        break;

      case 'COMPLETE_TURN':
        if (playerId === this.state.targetPlayerId && this.state.phase === 'ANSWERING') {
          const playerIds = Array.from(this.session.players.keys());
          this.selectRandomTarget(playerIds);
        }
        break;
    }

    return { success: true, gameState: this.state };
  }
}

module.exports = TruthOrDareGame;