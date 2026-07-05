# syntax=docker/dockerfile:1

FROM node:25-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:25-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3420
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
RUN chown -R node:node /app
USER node
EXPOSE 3420
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/server/server.js"]
