default:
    @just --list

install:
    npm install

ci:
    npm ci

up:
    docker compose -f compose.yml up -d --build

dev command='':
    @if [ '{{ command }}' = 'up' ]; then docker compose -f compose.dev.yml up -d --build; else npm run dev; fi

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
