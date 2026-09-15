#!/usr/bin/env sh
set -eu
npm run typecheck
node --check public/production-sync.js
printf 'AINFO V14 static/type checks passed.\n'
