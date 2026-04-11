#!/bin/bash
# run-tests.sh — Run full test suite (smoke + lifecycle)
# Usage: bash scripts/run-tests.sh

set -euo pipefail

echo "═══════════════════════════════════════════════"
echo "  Radix Guild — Full Test Suite"
echo "═══════════════════════════════════════════════"
echo ""

echo "Phase 1: Smoke Tests (pipeline-test.js)"
echo "────────────────────────────────────────"
node scripts/pipeline-test.js
SMOKE=$?

echo ""
echo "Phase 2: Lifecycle Tests (lifecycle-test.js)"
echo "────────────────────────────────────────"
node scripts/lifecycle-test.js
LIFECYCLE=$?

echo ""
echo "═══════════════════════════════════════════════"
if [ $SMOKE -eq 0 ] && [ $LIFECYCLE -eq 0 ]; then
  echo "  ✅ ALL TESTS PASSED"
else
  echo "  ❌ SOME TESTS FAILED"
fi
echo "═══════════════════════════════════════════════"

exit $(( SMOKE + LIFECYCLE ))
