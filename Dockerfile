# Stage 1: Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN mkdir -p node_modules && npm install --omit=dev

# Stage 2: Production runtime
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node app ./app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "app/index.js"]
