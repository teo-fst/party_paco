/**
 * src/bot/formatters.js
 * Utilità di formattazione del testo ed interfacce Telegram per Party Paco.
 */

function formatWelcomeMessage() {
  return `🎉 <b>Benvenuto in Party Paco - Multi Game Center!</b> 🎉\n\n` +
         `Ospita e partecipa a giochi di gruppo basati su frasi, turni e votazioni in tempo reale.\n\n` +
         `<b>Comandi disponibili:</b>\n` +
         `👉 /newgame - Crea una nuova stanza di gioco\n` +
         `👉 /join [CODICE] - Partecipa ad una stanza esistente (es. /join A7B9X2)\n` +
         `👉 /help - Mostra le istruzioni del bot`;
}

function formatRoomJoinedMessage(session, player) {
  return `✅ <b>Sei entrato nella stanza ${session.code}!</b>\n\n` +
         `🎮 Gioco: <b>${session.gameId}</b>\n` +
         `👤 Il tuo nome: <b>${player.name}</b>\n` +
         `👥 Giocatori connessi: <b>${session.players.length}</b>\n\n` +
         `In attesa che l'host avvii la partita o invii la prima frase.`;
}

module.exports = {
  formatWelcomeMessage,
  formatRoomJoinedMessage
};
