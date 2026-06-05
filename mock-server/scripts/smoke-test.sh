#!/usr/bin/env bash
# smoke-test.sh — verify the mock-server is reachable and healthy.
# Usage:
#   Local:  ./scripts/smoke-test.sh
#   Hosted: BASE_URL=https://your-mock-server.onrender.com ./scripts/smoke-test.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:4000}"

ok()   { echo "  ✅  $1"; }
fail() { echo "  ❌  $1"; exit 1; }

echo ""
echo "Yoinks mock-server smoke test"
echo "Base URL: $BASE_URL"
echo "─────────────────────────────────────"

# 1. Health check
echo ""
echo "1. GET /health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
[ "$STATUS" = "200" ] && ok "health → $STATUS" || fail "health → $STATUS (expected 200)"

# 2. GraphQL — basic query
echo ""
echo "2. POST /graphql (getFeedMoments)"
GQL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getFeedMoments(limit: 1) { items { id } } }"}')
[ "$GQL_STATUS" = "200" ] && ok "graphql → $GQL_STATUS" || fail "graphql → $GQL_STATUS (expected 200)"

# 3. Wallet debug endpoint
echo ""
echo "3. GET /wallet"
WALLET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/wallet")
[ "$WALLET_STATUS" = "200" ] && ok "wallet → $WALLET_STATUS" || fail "wallet → $WALLET_STATUS (expected 200)"

# 4. Feedback debug endpoint
echo ""
echo "4. GET /debug/feedback"
FB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/debug/feedback")
[ "$FB_STATUS" = "200" ] && ok "debug/feedback → $FB_STATUS" || fail "debug/feedback → $FB_STATUS (expected 200)"

# 5. Debug state snapshot
echo ""
echo "5. GET /debug/state"
DS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/debug/state")
[ "$DS_STATUS" = "200" ] && ok "debug/state → $DS_STATUS" || fail "debug/state → $DS_STATUS (expected 200)"

# 6. Mock login as Frederico
echo ""
echo "6. POST /login (mock-user-001 — Frederico)"
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"localDevBypass":true,"mockUserId":"mock-user-001"}')
[ "$LOGIN_STATUS" = "200" ] && ok "login mock-user-001 → $LOGIN_STATUS" || fail "login mock-user-001 → $LOGIN_STATUS (expected 200)"

# 7. Mock login as André
echo ""
echo "7. POST /login (mock-user-013 — André)"
LOGIN2_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"localDevBypass":true,"mockUserId":"mock-user-013"}')
[ "$LOGIN2_STATUS" = "200" ] && ok "login mock-user-013 → $LOGIN2_STATUS" || fail "login mock-user-013 → $LOGIN2_STATUS (expected 200)"

# 8. Invalid moment (should be 404)
echo ""
echo "8. GET /moments/does-not-exist (expect 404)"
M_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/moments/does-not-exist")
[ "$M_STATUS" = "404" ] && ok "moments/invalid → $M_STATUS (correct 404)" || fail "moments/invalid → $M_STATUS (expected 404)"

echo ""
echo "─────────────────────────────────────"
echo "All checks passed. Mock-server is healthy."
echo ""
