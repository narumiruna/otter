#!/usr/bin/env sh
set -eu

# Keep the Biome configuration and source files up to date before validating.
npx --no-install biome migrate --write
npx --no-install biome format --write .
npx --no-install biome check --write .

npm run check
