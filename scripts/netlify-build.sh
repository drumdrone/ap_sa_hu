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

