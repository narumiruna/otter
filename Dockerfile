# syntax=docker/dockerfile:1

FROM node:25-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY src/cli/package.json ./src/cli/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:25-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=17463
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
COPY scripts/docker-entrypoint.sh /usr/local/bin/otter-entrypoint
RUN chmod +x /usr/local/bin/otter-entrypoint && chown -R node:node /app
USER node
EXPOSE 17463
ENTRYPOINT ["otter-entrypoint"]
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server/server.js"]
