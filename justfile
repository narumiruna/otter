default:
    @just --list

install:
    npm install

ci:
    npm ci

produp:
    docker compose --profile production up -d --build otter

dev:
    docker compose up -d --build

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
