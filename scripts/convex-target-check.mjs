#!/usr/bin/env node

const APP_URL = process.argv[2] || "https://apsahuapo.netlify.app";
const EXPECTED_ENV = process.argv[3] || "prod";

function normalizeBaseUrl(input) {
  const url = new URL(input);
  return url.toString().replace(/\/$/, "");
}

function parseChunkPaths(html) {
  const matches = html.match(/\/_next\/static\/chunks\/[a-z0-9]+\.js/g) || [];
  return [...new Set(matches)].sort();
}

function firstMatch(content, regex) {
  const m = content.match(regex);
  return m ? m[1] : null;
}

function extractSlug(convexUrl) {
  const host = convexUrl.replace(/^https?:\/\//, "").split("/")[0];
  return host.split(".")[0];
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${url} (${res.status})`);
  }
  return await res.text();
}

async function main() {
  const baseUrl = normalizeBaseUrl(APP_URL);
  console.log(`Inspecting app URL: ${baseUrl}`);

  const html = await fetchText(baseUrl);
  const chunks = parseChunkPaths(html);

  if (chunks.length === 0) {
    console.error("ERROR: Could not find Next.js chunk paths in app HTML.");
    process.exit(1);
  }

  let detectedConvexUrl = null;

  for (const chunkPath of chunks) {
    const chunkUrl = `${baseUrl}${chunkPath}`;
    const chunk = await fetchText(chunkUrl);

    // Prefer runtime app config over generic library strings.
    detectedConvexUrl = firstMatch(
      chunk,
      /new ConvexReactClient\("((?:https:\/\/)[A-Za-z0-9.-]+\.convex\.cloud)"\)/,
    );
    if (detectedConvexUrl) break;
  }

  if (!detectedConvexUrl) {
    // Fallback when pattern above changes in future builds.
    for (const chunkPath of chunks) {
      const chunkUrl = `${baseUrl}${chunkPath}`;
      const chunk = await fetchText(chunkUrl);
      detectedConvexUrl = firstMatch(chunk, /(https:\/\/[A-Za-z0-9.-]+\.convex\.cloud)/);
      if (detectedConvexUrl) break;
    }
  }

  if (!detectedConvexUrl) {
    console.error("ERROR: Could not detect Convex URL from app bundle.");
    process.exit(1);
  }

  const detectedSlug = extractSlug(detectedConvexUrl);
  if (!detectedSlug) {
    console.error("ERROR: Failed to parse Convex deployment slug.");
    process.exit(1);
  }

  const suggestedDeployment = `${EXPECTED_ENV}:${detectedSlug}`;
  const currentDeployment = process.env.CONVEX_DEPLOYMENT || "";
  const currentSlug = currentDeployment.includes(":")
    ? currentDeployment.split(":", 2)[1]
    : currentDeployment;

  console.log("");
  console.log(`Detected frontend Convex URL: ${detectedConvexUrl}`);
  console.log(`Suggested terminal target:    ${suggestedDeployment}`);
  console.log(`Current CONVEX_DEPLOYMENT:    ${currentDeployment || "<not set>"}`);

  if (currentDeployment && currentSlug === detectedSlug) {
    console.log("Status: OK (terminal target slug matches frontend Convex slug).");
    return;
  }

  console.log("Status: MISMATCH (or CONVEX_DEPLOYMENT not set).");
  console.log("Use:");
  console.log(`  export CONVEX_DEPLOYMENT=${suggestedDeployment}`);
  console.log('  npx convex deploy --deployment "${CONVEX_DEPLOYMENT}" --cmd "npm run build"');
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
