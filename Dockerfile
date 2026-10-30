# KoraDevs : une seule image qui sert le site et le serveur (WebSocket compris).
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production \
    SOS_SERVE_WEB=1 \
    PORT=4000

# D'abord les fichiers de dépendances : l'installation est mise en cache tant qu'ils ne changent pas.
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY cli/package.json cli/
COPY web/package.json web/
RUN npm ci --include=dev

COPY shared shared
COPY server server
COPY cli cli
COPY web web
RUN npm run build

# On garde seulement ce qui sert à faire tourner l'application.
RUN npm prune --omit=dev

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/dist/main.js"]
