# Party Paco - Application Center Multi-Gioco (Framework Scalabile)

**Party Paco** è un framework generico, modulare e scalabile in **Node.js, Express, Socket.io, Telegram Bot e SQLite** progettato per ospitare qualsiasi gioco di gruppo basato su turni, frasi o votazioni di consenso.

---

## 🎯 Obiettivo dell'Architettura

L'obiettivo principale è separare nettamente l'infrastruttura di piattaforma (**Core Game-Agnostic**) dalla logica specifica dei singoli giochi (**Game Modules**).

```
                      +-----------------------------+
                      |     Client Web (Socket)     |
                      |    & Telegram Bot Adapter   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Multi-Channel Sync Mgr    |
                      |  Single Source of Truth     |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |       FRAMEWORK CORE        |
                      |  - SessionManager (6-digit) |
                      |  - ConsensusEngine          |
                      |  - ContentPoolManager       |
                      |  - SQLite Storage           |
                      +--------------+--------------+
                                     |
                         [ GameInterface Contract ]
                                     |
            +------------------------+------------------------+
            |                                                 |
+-----------v-----------+                         +-----------v-----------+
| Module: Non Ho Mai    |                         | Module: Chi di Noi    |
| (Pluggable Game)      |                         | (Pluggable Game)      |
+-----------------------+                         +-----------------------+
```

---

## 🛠️ Moduli e Funzionalità Principali

1. **Gestione Sessioni**: Generazione automatica di codici a 6 cifre alfanumerici univoci (es. `A7B9X2`).
2. **Sincronizzazione Multi-Canale**: Sincronizzazione in tempo reale tra Web (WebSockets via Socket.io) e Bot Telegram (messaggi dinamici ed inline keyboards).
3. **Motore di Consenso Generico**: Tracciamento delle votazioni, conteggio percentuale e notifica automatica di completamento fase.
4. **Pool di Contenuti Ibrido**: Gestione frasi/domande con estrazione casuale priva di ripetizioni nella stessa sessione.
5. **Storage SQLite**: Persistenza WAL delle sessioni e registro storico delle azioni di gioco.
6. **Containerizzazione Docker**: Esecuzione containerizzata pulita con porta `6767`, pronta per Raspberry Pi 5 e Tailscale.

---

## 📁 Struttura del Progetto

```
party-paco/
├── Dockerfile                  # Containerizzazione multi-stage Node.js 20 Alpine
├── docker-compose.yml          # Servizio con volume SQLite e variabili ambiente
├── package.json                # Dipendenze Node.js (Express, Socket.io, SQLite, Telegram)
├── .env.example                # Configurazione di esempio
├── README.md                   # Documentazione completa
├── docs/
│   └── EXTENSION_GUIDE.md      # Guida per collegare nuovi giochi
├── src/
│   ├── index.js                # Entrypoint principale
│   ├── config.js               # Configurazione ambiente centralizzata
│   ├── core/                   # CORE GAME-AGNOSTIC
│   │   ├── GameInterface.js    # Contratto astratto per tutti i giochi
│   │   ├── SessionManager.js   # Gestione stanze, codici 6 cifre e lifecycle
│   │   ├── GameRegistry.js     # Registro dei moduli gioco registrati
│   │   ├── SyncManager.js      # Synchronizer WebSocket + Telegram
│   │   ├── ConsensusEngine.js  # Motore generico per votazioni
│   │   ├── ContentPoolManager.js # Gestore pool di frasi
│   │   └── Database.js         # Layer SQLite per persistenza
│   ├── games/                  # MODULI GIOCO PLUGGABILI
│   │   └── non-ho-mai/         # Primo gioco di esempio
│   │       ├── index.js        # Implementazione di GameInterface
│   │       ├── logic.js        # State machine e regole del gioco
│   │       └── content/        # Frasi JSON (classic, party, spicy)
│   ├── bot/                    # ADATTATORE TELEGRAM BOT
│   │   ├── telegramBot.js      # Comandi Telegram & Inline Keyboard updates
│   │   └── formatters.js       # Formattazione HTML messaggi Telegram
│   └── web/                    # FRONTEND WEB SPA
│       └── public/
│           ├── index.html      # Single Page Application
│           ├── css/style.css   # Design System Scuro con Glassmorphism
│           └── js/             # UI Manager e Socket.io Client Engine
```

---

## 🚀 Guida all'Installazione ed Avvio via Docker

### 1. Clona o Posizionati nella Cartella del Progetto

```bash
cd party-paco
```

### 2. Configura le Variabili d'Ambiente

Copia il file `.env.example` in `.env`:

```bash
cp .env.example .env
```

Modifica il file `.env` aggiungendo il tuo **Telegram Bot Token** fornito da `@BotFather` (opzionale):

```env
PORT=6767
TELEGRAM_BOT_TOKEN=your_token_bot
TELEGRAM_ENABLED=true
```

### 3. Avvia con Docker Compose

```bash
docker-compose up -d --build
```

L'applicazione sarà subito accessibile su:
- **Web UI & REST API**: `http://localhost:6767` oppure `http://<IP_TAILSCALE>:6767`
- **Healthcheck Endpoint**: `http://localhost:6767/health`

---

## 🎮 Flusso d'Uso (Web & Telegram)

### Flusso da Web:
1. Apri `http://<IP_SERVER>:6767` nel browser.
2. Inserisci il tuo nome e clicca **Crea Stanza** per generare un codice a 6 cifre (es. `A7B9X2`).
3. Gli altri utenti possono inserire il codice ed unire i propri dispositivi in tempo reale.
4. L'host seleziona la categoria (Classico, Party, Spicy) ed avvia il gioco.
5. Tutti i partecipanti votano *"L'ho fatto"* oppure *"Mai fatto"* vedendo l'aggiornamento istantaneo del consenso.

### Flusso da Telegram:
1. Avvia la chat con il bot ed invia il comando `/start`.
2. Invia `/newgame` per scegliere il gioco e creare una nuova stanza.
3. Oppure unisciti a una stanza Web esistente inviando `/join A7B9X2`.
4. Vota direttamente dalle **Inline Keyboards** trasmesse nel messaggio live del bot!

---

## 🔌 Come Aggiungere un Secondo Gioco

Consulta la guida dedicata in [`docs/EXTENSION_GUIDE.md`](docs/EXTENSION_GUIDE.md) per scoprire come aggiungere un nuovo modulo gioco (es. *"Chi di Noi"*) in meno di 10 minuti senza toccare il core.
