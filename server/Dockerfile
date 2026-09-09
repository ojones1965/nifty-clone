# Flow data + MCP server. Reuses src/lib unchanged, so both directories are
# copied in; the app's own build is not needed here. Build context is the
# repo root (see docker-compose.yml).
FROM node:22-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY src/lib/ /app/src/lib/
ENV NODE_ENV=production PORT=3000 DATA_FILE=/data/flow-data.json
EXPOSE 3000
CMD ["node", "index.js"]
