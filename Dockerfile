# Dockerfile per Application Center Multi-Gioco Party Paco
FROM node:20-alpine AS builder

# Installa strumenti di compilazione per pacchetti nativi C++ (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Copia i file di dipendenza
COPY package*.json ./

# Installa dipendenze (incluse quelle native)
RUN npm install --production

# Copia il codice sorgente
COPY . .

# Immagine finale di produzione
FROM node:20-alpine AS runner

WORKDIR /app

# Installa runtime sqlite
RUN apk add --no-cache sqlite-libs

# Copia i nodi di build e i sorgenti
COPY --from=builder /app /app

# Crea la directory per il database persistente
RUN mkdir -p /app/data

# Espone la porta del server (6767)
EXPOSE 6767

ENV PORT=6767
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Avvio dell'applicazione
CMD ["node", "src/index.js"]
