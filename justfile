dev_database_url := 'postgres://otter:otter_dev_password@127.0.0.1:55432/otter_dev'
dev_admin_email := 'admin@otter.local'
dev_admin_password := 'admin1234'

default:
    @just --list

install:
    npm install

ci:
    npm ci

up:
    docker compose -f compose.yml up -d --build

dev:
    docker compose -f compose.dev.yml up -d --wait postgres
    DATABASE_URL="${DATABASE_URL:-{{ dev_database_url }}}" npm run migrate
    DATABASE_URL="${DATABASE_URL:-{{ dev_database_url }}}" NODE_ENV=development DEV_ADMIN_NAME=Admin DEV_ADMIN_EMAIL={{ dev_admin_email }} DEV_ADMIN_PASSWORD={{ dev_admin_password }} npm run dev

devup:
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
