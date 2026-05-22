#!/usr/bin/env bash
# Usage: bash sync-and-test.sh [pytest-args]
# Syncs backend/ to VPS and runs tests there

set -e

VPS="jarvis@j4rvis.com.br"
REMOTE_DIR="/home/jarvis/recibo42-dev"
VENV="$REMOTE_DIR/.venv"

echo "==> Syncing backend/ to VPS..."
# Create tar excluding pyc/cache, pipe to VPS
tar --exclude='__pycache__' --exclude='*.pyc' --exclude='.pytest_cache' \
  -czf - backend/ | ssh "$VPS" "cd $REMOTE_DIR && tar -xzf -"

echo "==> Installing/updating dependencies..."
ssh "$VPS" "cd $REMOTE_DIR && $VENV/bin/pip install -q -r backend/requirements.txt"

echo "==> Running tests..."
ssh "$VPS" "cd $REMOTE_DIR/backend && \
  SECRET_KEY=testsecretkey-for-ci-only-not-production-use \
  COOKIE_SECURE=false \
  ANTHROPIC_API_KEY=dummy \
  STORAGE_ROOT=/tmp/recibo42-test \
  DATABASE_URL=postgresql://recibo42:recibo42@localhost:5433/recibo42_test \
  TEST_DATABASE_URL=postgresql://recibo42:recibo42@localhost:5433/recibo42_test \
  REDIS_URL=redis://localhost:6380/0 \
  $VENV/bin/pytest ${@:-tests/} -v"
