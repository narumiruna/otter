default:
    @just --list

install:
    npm install

ci:
    npm ci

produp:
    docker compose -f compose.yml up -d --build

dev:
    docker compose -f compose.dev.yml up -d --build

build:
    npm run build

start:
    npm start

typecheck:
    npm run typecheck

test:
    npm test

biome:
    npm run biome:ci

check:
    npm run check
