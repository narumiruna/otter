dev_database_url := 'postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev'

default:
    @just --list

install:
    npm install

ci:
    npm ci

up:
    docker compose -f compose.yml up -d --build

dev command='local':
    @if [ '{{ command }}' = 'up' ]; then \
        docker compose -f compose.dev.yml up -d --build; \
    else \
        docker compose -f compose.dev.yml up -d --wait postgres && \
        DATABASE_URL="${DATABASE_URL:-{{ dev_database_url }}}" npm run migrate && \
        DATABASE_URL="${DATABASE_URL:-{{ dev_database_url }}}" npm run dev; \
    fi

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
