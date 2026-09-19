default:
    @just --list

install:
    npm install

ci:
    npm ci

produp:
    docker compose up -d --build otter

dev:
    docker compose up -d --build

up:
    docker compose up -d --build --remove-orphans

down:
    docker compose down --remove-orphans

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
