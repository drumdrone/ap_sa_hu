#!/usr/bin/env bash
set -euo pipefail

echo "Netlify build script starting..."
echo "COMMIT_REF=${COMMIT_REF:-}"
echo "CACHED_COMMIT_REF=${CACHED_COMMIT_REF:-}"
echo "NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL:-}"
echo "CONVEX_DEPLOYMENT=${CONVEX_DEPLOYMENT:-}"
echo "NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT:-}"

should_deploy_convex="false"

extract_convex_slug_from_url() {
  local url="$1"
  local host=""
  local slug=""
  host="${url#https://}"
  host="${host#http://}"
  host="${host%%/*}"
  slug="${host%%.*}"
  printf "%s" "${slug}"
}

# Always deploy Convex when targeting a Convex deployment (i.e. production
# context). The previous "diff against CACHED_COMMIT_REF" heuristic could skip
# redeploys when Netlify's build cache was fresh but the Convex deployment had
# drifted (e.g. a new Netlify site connected to a Convex deployment that never
# received the latest functions). That manifested as the frontend calling
# functions like `api.editors.list` that didn't exist on the backend, breaking
# the product detail page. Convex deploys are idempotent and fast, so always
# running them on production builds is the safe default.
if [[ -n "${CONVEX_DEPLOYMENT:-}" ]]; then
  should_deploy_convex="true"
fi

# Allow manual override from Netlify environment (kept for completeness; e.g.
# to force a deploy from a context that doesn't normally set CONVEX_DEPLOYMENT).
if [[ "${FORCE_CONVEX_DEPLOY:-}" == "true" ]]; then
  should_deploy_convex="true"
fi

echo "Convex deploy needed: ${should_deploy_convex}"

if [[ "${should_deploy_convex}" == "true" ]]; then
  if [[ -z "${CONVEX_DEPLOYMENT:-}" ]]; then
    echo "ERROR: CONVEX_DEPLOYMENT is required for Convex deploy."
    exit 1
  fi
  if [[ -z "${NEXT_PUBLIC_CONVEX_URL:-}" ]]; then
    echo "ERROR: NEXT_PUBLIC_CONVEX_URL is required for Convex deploy."
    exit 1
  fi

  deployment_slug="${CONVEX_DEPLOYMENT#*:}"
  url_slug="$(extract_convex_slug_from_url "${NEXT_PUBLIC_CONVEX_URL}")"

  if [[ -z "${deployment_slug}" || -z "${url_slug}" ]]; then
    echo "ERROR: Failed to parse deployment slug from CONVEX_DEPLOYMENT or NEXT_PUBLIC_CONVEX_URL."
    exit 1
  fi

  if [[ "${deployment_slug}" != "${url_slug}" ]]; then
    echo "ERROR: Convex mismatch detected."
    echo "  CONVEX_DEPLOYMENT slug: ${deployment_slug}"
    echo "  NEXT_PUBLIC_CONVEX_URL slug: ${url_slug}"
    echo "Refusing to deploy because frontend and backend target different Convex deployments."
    exit 1
  fi

  echo "Running Convex deploy (includes Next build)..."
  npx convex deploy --deployment "${CONVEX_DEPLOYMENT}" --cmd "npm run build"
else
  echo "Skipping Convex deploy (no backend changes). Running Next build only..."
  npm run build
fi

echo "Netlify build script done."

