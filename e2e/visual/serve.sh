#!/usr/bin/env bash
# Builds the web client and serves it from the API in production mode, as Fly runs it, on a throwaway database.
set -euo pipefail
cd "$(dirname "$0")/../.."
PORT="${VISUAL_PORT:-4183}"
if [ -z "${VISUAL_SKIP_BUILD:-}" ]; then
  # vite build without the typecheck: the visual job tests the picture, and Checks typechecks.
  (cd apps/web && npx vite build ${VISUAL_VITE_CONFIG:+--config "$VISUAL_VITE_CONFIG"})
fi
DB_DIR="$(mktemp -d)"
export NODE_ENV=production PORT BETTER_AUTH_URL="http://localhost:$PORT" BETTER_AUTH_SECRET="visual-tests-only-secret-0123456789abcdef" STILLWATER_DB_PATH="$DB_DIR/stillwater.sqlite"
exec pnpm --filter @stillwater/api start
