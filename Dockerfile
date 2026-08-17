FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ build-base

FROM base AS development
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/src ./src
CMD ["node", "src/index.js"]