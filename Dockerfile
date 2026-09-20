# syntax=docker/dockerfile:1

FROM node:25-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/cli/package.json ./packages/cli/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/exchange-rates/package.json ./packages/exchange-rates/package.json
COPY packages/core/package.json ./packages/core/package.json
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
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/cli/package.json ./packages/cli/package.json
COPY --from=build /app/packages/cli/dist ./packages/cli/dist
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/exchange-rates/package.json ./packages/exchange-rates/package.json
COPY --from=build /app/packages/exchange-rates/dist ./packages/exchange-rates/dist
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY scripts/docker-entrypoint.sh /usr/local/bin/otter-entrypoint
RUN chmod +x /usr/local/bin/otter-entrypoint && chown -R node:node /app
USER node
EXPOSE 17463
ENTRYPOINT ["otter-entrypoint"]
CMD ["sh", "-c", "node apps/api/dist/scripts/migrate.js && node apps/api/dist/server.js"]
