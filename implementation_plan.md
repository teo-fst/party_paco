# Piano di Implementazione: Application Center Multi-Gioco ("Party Paco")

Progettazione e realizzazione di un **framework generico e scalabile** in Node.js / Express / Socket.io / SQLite per la gestione di giochi di gruppo basati su turni, frasi, votazioni e consenso.

Il core del framework è totalmente **game-agnostic** e fornisce servizi riutilizzabili (gestione sessioni a 6 cifre, sincronizzazione multi-canale Web + Telegram in tempo reale, motore di votazione/consenso, storage SQLite e pool di contenuti).

---

## Architettura Concettuale

```
 +-----------------------------------------------------------------------+
 |                            CLIENT LAYERS                              |
 |  +---------------------+  +--------------------+  +----------------+  |
 |  |   Web UI (Socket)   |  |  Telegram Bot UI   |  | REST API Client|  |
 |  +----------+----------+  +---------+----------+  +-------+--------+  |
 +-------------|-----------------------|---------------------|-----------+
               |                       |                     |
 +-------------v-----------------------v---------------------v-----------+
 |                    MULTI-CHANNEL SYNC MANAGER                         |
 |  - Single Source of Truth (SSOT) Event Bus                            |
 |  - Broadcast to Socket.io Rooms                                       |
 |  - Telegram Inline Keyboard & Live Message Updater                    |
 +-------------------------------------+---------------------------------+
                                       |
 +-------------------------------------v---------------------------------+
 |                           FRAMEWORK CORE                              |
 |  +------------------+  +-------------------+  +--------------------+  |
 |  | Session Engine   |  | Consensus Engine  |  | Content Pool Mgr   |  |
 |  | (6-digit codes)  |  | (Voting/Tally)    |  | (Category & Draw)  |  |
 |  +------------------+  +-------------------+  +--------------------+  |
 |  +-----------------------------------------------------------------+  |
 |  | Game Registry & Engine Dispatcher                               |  |
 |  +-----------------------------------------------------------------+  |
 +-------------------------------------+---------------------------------+
                                       |
                     +-----------------+-----------------+
                     | Contract Interface (GameInterface) |
                     +-----------------+-----------------+
                                       |
 +-------------------------------------v---------------------------------+
 |                         PLUGGABLE GAME MODULES                        |
 |  +--------------------------------+  +-----------------------------+  |
 |  | Module: "Non Ho Mai"           |  | Module: "Chi di Noi" (Fut.) |  |
 |  | - Logic State Machine          |  | - Custom logic & questions  |  |
 |  | - Questions Pool (JSON/DB)     |  +-----------------------------+  |
 |  | - Custom Renderers (Web/TG)    |                                   |
 |  +--------------------------------+                                   |
 +-------------------------------------+---------------------------------+
                                       |
 +-------------------------------------v---------------------------------+
 |                           STORAGE LAYER                               |
 |  - SQLite (better-sqlite3/sqlite3) for persistent sessions & stats    |
 |  - JSON File Loader for game pools                                    |
 +-----------------------------------------------------------------------+
```

---

## User Review Required

> [!IMPORTANT]
> **Containerizzazione Docker**: In base al tuo vincolo, l'intera applicazione verrà containerizzata tramite `docker-compose` e `Dockerfile` basati su `node:20-alpine`. Nessun prerequisito Node.js è richiesto sulla macchina host.
>
> **Token Bot Telegram**: Se disponi già di un Bot Token di Telegram creato con `@BotFather`, potrai inserirlo nel file `.env`. Se non è configurato, il bot funzionerà in modalità "dry-run/disabled" consentendo il completo funzionamento della WebApp senza crash.

---

## Open Questions

> [!NOTE]
> Nessun blocco critico identificato. L'architettura è stata progettata per garantire l'avvio immediato con Docker e consentire l'aggiunta di futuri giochi in sottocartelle dedicate con un solo file di contratto.

---

## Struttura del Progetto

```
party-paco/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── index.js                    # Entry point dell'applicazione (Express + Socket + Telegram)
│   ├── config.js                   # Configurazione ambiente e costanti
│   ├── core/                       # FRAMEWORK CORE (GAME-AGNOSTIC)
│   │   ├── SessionManager.js       # Gestione stanze, codici 6 cifre, lifecycle
│   │   ├── GameRegistry.js         # Registro ed autodiscovery dei moduli gioco
│   │   ├── SyncManager.js          # Synchronizer multi-canale (Socket + Telegram)
│   │   ├── ConsensusEngine.js      # Motore astratto per votazioni e consenso
│   │   ├── ContentPoolManager.js   # Gestione memory/DB pool delle frasi
│   │   ├── Database.js             # Layer di persistenza SQLite
│   │   └── GameInterface.js        # Classe astratta/contratto che ogni gioco implementa
│   ├── games/                      # MODULI GIOCO PLUGGABILI
│   │   └── non-ho-mai/             # Primo modulo "Non Ho Mai"
│   │       ├── index.js            # Implementazione del contratto GameInterface
│   │       ├── logic.js            # State machine e regole del gioco
│   │       └── content/            # Pool di frasi suddiviso per categorie
│   │           ├── classic.json
│   │           ├── spicy.json
│   │           └── party.json
│   ├── bot/                        # TELEGRAM BOT ADAPTER
│   │   ├── telegramBot.js          # Listener Telegram e gestore inline buttons
│   │   └── formatters.js           # Formattatori messaggi Telegram per il gioco attivo
│   └── web/                        # FRONTEND WEB APPLICATION
│       ├── public/
│       │   ├── index.html          # SPA per creazione, join e gameplay
│       │   ├── css/
│       │   │   └── style.css       # Design System scuro, moderno con glassmorphism
│       │   └── js/
│       │       ├── app.js          # Core client JS, Socket.io listener
│       │       └── ui.js           # Rendering dinamico componenti e votazioni
│       └── views/                  # Eventuali template HTML statici o di supporto
└── docs/
    └── EXTENSION_GUIDE.md          # Guida dettagliata per aggiungere un 2° gioco
```

---

## Proposed Changes

### [Core Framework Implementation]

#### [NEW] [package.json](file:///e:/02_Sviluppo/Clienti/party-paco/package.json)
- Dipendenze: `express`, `socket.io`, `node-telegram-bot-api` (o `telegraf`), `better-sqlite3` (o `sqlite3`), `dotenv`, `cors`.

#### [NEW] [Dockerfile](file:///e:/02_Sviluppo/Clienti/party-paco/Dockerfile)
- Multi-stage o alpine image per Node 20, installazione dipendenze, esposizione porta 6767.

#### [NEW] [docker-compose.yml](file:///e:/02_Sviluppo/Clienti/party-paco/docker-compose.yml)
- Configurazione servizio `party-paco`, binding porta `6767:6767`, volume per database SQLite persistente.

#### [NEW] [src/core/GameInterface.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/core/GameInterface.js)
- Definizione dell'interfaccia/contratto astratto che ogni gioco deve estendere (`id`, `name`, `initGameState`, `handleAction`, `getPublicState`, `renderTelegramMessage`).

#### [NEW] [src/core/SessionManager.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/core/SessionManager.js)
- Generazione codici univoci a 6 caratteri alfanumerici (`A-Z0-9`).
- Gestione lifecycle della sessione (`CREATED`, `WAITING`, `PLAYING`, `FINISHED`).
- Registrazione e disconnessione giocatori sia da Web che da Telegram.

#### [NEW] [src/core/SyncManager.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/core/SyncManager.js)
- Motore di sincronizzazione reale tra eventi WebSocket e messaggi Telegram per prevenire race conditions.
- Single Source of Truth nel Session Store.

#### [NEW] [src/core/ConsensusEngine.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/core/ConsensusEngine.js)
- Motore generico per raccogliere voti/risposte, verificare la percentuale di completamento/consenso e notificare il completamento del turno.

#### [NEW] [src/core/ContentPoolManager.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/core/ContentPoolManager.js)
- Caricamento in memoria e indicizzazione dei pool di frasi/domande con tracciamento degli id già estratti per sessione (evita ripetizioni).

---

### [Game Module Implementation]

#### [NEW] [src/games/non-ho-mai/index.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/games/non-ho-mai/index.js)
- Modulo "Non Ho Mai": implementa `GameInterface`.
- Azioni supportate: `SELECT_CATEGORY`, `DRAW_PHRASE`, `VOTE` ("L'ho fatto" / "Mai fatto"), `NEXT_ROUND`.
- Pool di frasi suddivise per 3 categorie (Classico, Party, Spicy).

---

### [Telegram & Web UI]

#### [NEW] [src/bot/telegramBot.js](file:///e:/02_Sviluppo/Clienti/party-paco/src/bot/telegramBot.js)
- Gestione comandi `/start`, `/newgame`, `/join`.
- Gestione bottoni inline (es. voti in tempo reale che aggiornano istantaneamente l'interfaccia sia su Telegram che su Web).

#### [NEW] [src/web/public/index.html](file:///e:/02_Sviluppo/Clienti/party-paco/src/web/public/index.html)
- UI responsive ad altissimo impatto visivo con font Google "Outfit" e "Inter", card animate, selezioni stanze e schermo di gioco.

#### [NEW] [src/web/public/css/style.css](file:///e:/02_Sviluppo/Clienti/party-paco/src/web/public/css/style.css)
- CSS personalizzato in Vanilla CSS con glassmorphism, gradienti moderni e animazioni fluide di transizione.

---

## Verification Plan

### Automated Verification via Docker
- Costruzione ed esecuzione del container Docker:
  `docker build -t party-paco .`
  `docker run --rm -p 6767:6767 party-paco`
- Test di salute HTTP (`GET http://localhost:6767/health` o `/api/info`).

### Manual Verification & Dynamic Tests
1. **Creazione Sessione**: Creare una sessione via REST / Web UI ed evidenziare il codice a 6 cifre.
2. **Multi-Client Sync**: Aprire due schede browser / device ed effettuare l'ingresso nella stessa stanza; verificare l'aggiornamento istantaneo dei partecipanti e delle votazioni tramite Socket.io.
3. **Telegram Bot Sync**: Testare l'unione della stanza via Telegram inserendo il codice a 6 cifre e votando via inline buttons.
4. **Verifica Non Ho Mai**: Svolgere 3 turni di gioco "Non Ho Mai" verificando il conteggio voti e l'estrazione senza ripetizione delle frasi.
