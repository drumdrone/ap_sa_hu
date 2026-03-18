#!/usr/bin/env bash
set -euo pipefail

echo "Netlify build script starting..."
echo "COMMIT_REF=${COMMIT_REF:-}"
echo "CACHED_COMMIT_REF=${CACHED_COMMIT_REF:-}"

should_deploy_convex="false"

# If Netlify can't determine a proper diff base, be safe and deploy Convex.
if [[ -z "${COMMIT_REF:-}" || -z "${CACHED_COMMIT_REF:-}" || "${CACHED_COMMIT_REF:-}" == "0000000000000000000000000000000000000000" ]]; then
  should_deploy_convex="true"
fi

# Allow manual override from Netlify environment.
if [[ "${FORCE_CONVEX_DEPLOY:-}" == "true" ]]; then
  should_deploy_convex="true"
fi

# Check if Convex backend changed between cached and current commit.
if [[ "${should_deploy_convex}" != "true" ]]; then
  if git diff --name-only "${CACHED_COMMIT_REF}" "${COMMIT_REF}" | grep -E '^convex/' >/dev/null 2>&1; then
    should_deploy_convex="true"
  fi
fi

echo "Convex deploy needed: ${should_deploy_convex}"

if [[ "${should_deploy_convex}" == "true" ]]; then
  echo "Running Convex deploy (includes Next build)..."
  npx convex deploy --cmd "npm run build"
else
  echo "Skipping Convex deploy (no backend changes). Running Next build only..."
  npm run build
fi

echo "Netlify build script done."

