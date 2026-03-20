#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-https://apsahuapo.netlify.app}"
EXPECTED_ENV="${2:-prod}"

echo "Inspecting app URL: ${APP_URL}"

html="$(curl -fsSL "${APP_URL}")"
chunk_paths="$(printf "%s" "${html}" | rg -o "/_next/static/chunks/[a-z0-9]+\\.js" | sort -u)"

if [[ -z "${chunk_paths}" ]]; then
  echo "ERROR: Could not find Next.js chunk paths in app HTML."
  exit 1
fi

detected_convex_url=""
while IFS= read -r chunk; do
  [[ -z "${chunk}" ]] && continue
  chunk_url="${APP_URL%/}${chunk}"
  convex_url="$(curl -fsSL "${chunk_url}" | rg -o "https://[A-Za-z0-9.-]+\\.convex\\.cloud" -m 1 || true)"
  if [[ -n "${convex_url}" ]]; then
    detected_convex_url="${convex_url}"
    break
  fi
done <<< "${chunk_paths}"

if [[ -z "${detected_convex_url}" ]]; then
  echo "ERROR: Could not detect Convex URL from app bundle."
  exit 1
fi

convex_host="${detected_convex_url#https://}"
convex_host="${convex_host%%/*}"
detected_slug="${convex_host%%.*}"

if [[ -z "${detected_slug}" ]]; then
  echo "ERROR: Failed to parse Convex deployment slug."
  exit 1
fi

suggested_deployment="${EXPECTED_ENV}:${detected_slug}"
current_deployment="${CONVEX_DEPLOYMENT:-}"
current_slug="${current_deployment#*:}"

echo ""
echo "Detected frontend Convex URL: ${detected_convex_url}"
echo "Suggested terminal target:    ${suggested_deployment}"
echo "Current CONVEX_DEPLOYMENT:    ${current_deployment:-<not set>}"

if [[ -n "${current_deployment}" && "${current_slug}" == "${detected_slug}" ]]; then
  echo "Status: OK (terminal target slug matches frontend Convex slug)."
else
  echo "Status: MISMATCH (or CONVEX_DEPLOYMENT not set)."
  echo "Use:"
  echo "  export CONVEX_DEPLOYMENT=${suggested_deployment}"
  echo "  npx convex deploy --deployment \"\${CONVEX_DEPLOYMENT}\" --cmd \"npm run build\""
fi
