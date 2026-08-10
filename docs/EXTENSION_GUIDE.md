# Guida all'Estensione: Come Aggiungere un Secondo Gioco a Party Paco

Questa guida spiega passo-passo come aggiungere un secondo modulo gioco (es. **"Chi di Noi"**, **"Trivia"**, **"Obbligo o Verità"**) al framework **Party Paco** senza toccare una singola riga del codice core!

---

## 1. Architettura Plug-and-Play

Il core di Party Paco non conosce le regole dei singoli giochi. Comunica con ciascun gioco tramite il contratto definito dall'interfaccia astratta [`src/core/GameInterface.js`](../src/core/GameInterface.js).

Per aggiungere un nuovo gioco, occorre semplicemente creare una nuova sottocartella in `src/games/` contenente i file del gioco ed estendere `GameInterface`.

---

## 2. Struttura Minima della Cartella del Nuovo Gioco

Esempio per un secondo gioco chiamato `"chi-di-noi"`:

```
src/games/chi-di-noi/
├── index.js           # Implementazione del contratto GameInterface
├── logic.js           # Regole e state machine del gioco
└── content/           # Pool di domande/frasi
    └── questions.json # File JSON con il pool di domande
```

---

## 3. Guida Passo-Passo all'Implementazione

### Passo 1: Crea il file di contenuto (`src/games/chi-di-noi/content/questions.json`)

```json
[
  "Chi di noi rimarrebbe bloccato per primo in un ascensore?",
  "Chi di noi ha più probabilità di diventare famoso?",
  "Chi di noi dimenticherebbe il portafoglio al primo appuntamento?",
  "Chi di noi sopravviverebbe più a lungo su un'isola deserta?"
]
```

---

### Passo 2: Definisci la State Machine (`src/games/chi-di-noi/logic.js`)

Utilizza il motore di consenso generico [`ConsensusEngine`](../src/core/ConsensusEngine.js) fornito dal core per raccogliere i voti dei giocatori.

```javascript
const contentPoolManager = require('../../core/ContentPoolManager');
const ConsensusEngine = require('../../core/ConsensusEngine');

class ChiDiNoiLogic {
  static createInitialState(session, options = {}) {
    return {
      phase: 'LOBBY',
      currentQuestion: null,
      usedIds: [],
      voting: null
    };
  }

  static handleAction(gameState, session, player, action, payload) {
    let updatedState = { ...gameState };
    const events = [];

    if (action === 'START_GAME' || action === 'NEXT_ROUND') {
      const q = contentPoolManager.drawRandomItem('chi-di-noi', 'default', updatedState.usedIds);
      if (!q) throw new Error("Pool di domande esaurito!");

      updatedState.phase = 'VOTING';
      updatedState.currentQuestion = q;
      updatedState.usedIds.push(q.id);

      const activePlayers = session.players.map(p => p.id);
      updatedState.voting = ConsensusEngine.createVoteState(activePlayers);
    } else if (action === 'VOTE') {
      // payload.targetPlayerId contiene l'ID del giocatore votato
      const { updatedState: newVote, isNewlyCompleted } = ConsensusEngine.submitVote(
        updatedState.voting,
        player.id,
        payload.targetPlayerId
      );
      updatedState.voting = newVote;

      if (isNewlyCompleted) {
        updatedState.phase = 'SUMMARY';
      }
    }

    return { updatedState, events };
  }
}

module.exports = ChiDiNoiLogic;
```

---

### Passo 3: Implementa il Contratto (`src/games/chi-di-noi/index.js`)

```javascript
const path = require('path');
const GameInterface = require('../../core/GameInterface');
const contentPoolManager = require('../../core/ContentPoolManager');
const ChiDiNoiLogic = require('./logic');

class ChiDiNoiGame extends GameInterface {
  constructor() {
    super();
    // Carica il pool di domande
    const contentPath = path.join(__dirname, 'content', 'questions.json');
    contentPoolManager.loadPoolFromFile(this.id, 'default', contentPath);
  }

  get id() {
    return 'chi-di-noi'; // ID univoco del modulo
  }

  get name() {
    return 'Chi di Noi'; // Nome visualizzato
  }

  get description() {
    return 'Vota chi tra i partecipanti ha più probabilità di compiere l\'azione!';
  }

  get minPlayers() {
    return 2;
  }

  initGameState(session, options) {
    return ChiDiNoiLogic.createInitialState(session, options);
  }

  handleAction(session, player, action, payload) {
    return ChiDiNoiLogic.handleAction(session.gameState, session, player, action, payload);
  }

  renderTelegramView(session) {
    const state = session.gameState || {};
    const question = state.currentQuestion ? state.currentQuestion.text : 'Pronto ad iniziare!';

    let text = `👥 <b>CHI DI NOI</b> (Stanza: <code>${session.code}</code>)\n\n`;
    text += `❓ <i>"${question}"</i>`;

    // Crea bottoni inline con i nomi dei partecipanti
    const playerButtons = session.players.map(p => ([
      { text: `👉 ${p.name}`, callback_data: `vote:${p.id}:${session.code}` }
    ]));

    return {
      text,
      reply_markup: { inline_keyboard: playerButtons }
    };
  }
}

module.exports = new ChiDiNoiGame();
```

---

### Passo 4: Registra il gioco in `src/index.js` (Solo 2 righe!)

Apri [`src/index.js`](../src/index.js) ed aggiungi la registrazione:

```javascript
const chiDiNoiGame = require('./games/chi-di-noi');
gameRegistry.registerGame(chiDiNoiGame);
```

Il gioco sarà immediatamente disponibile su **Web UI REST**, **Socket.io** e **Bot Telegram** con codici a 6 cifre e sincronizzazione in tempo reale!
