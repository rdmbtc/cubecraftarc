#!/bin/bash
set -e
cd /root/cubecraftarc 2>/dev/null || cd /vercel/path0 || true

echo "=== Starting CubeCraft Arc Tycoon Build ==="
echo "Node version: $(node -v)"
echo "PNPM version: $(pnpm -v)"

# Generate data files
echo "=== Generating shims ==="
npx tsx scripts/genShims.ts || echo "genShims skipped"

echo "=== Generating optimized MC data ==="
npx tsx scripts/makeOptimizedMcData.mjs || echo "makeOptimizedMcData skipped"

echo "=== Generating large data aliases ==="
npx tsx scripts/genLargeDataAliases.ts || echo "genLargeDataAliases skipped"

# Copy assets to dist
echo "=== Copying assets ==="
mkdir -p dist
cp -r assets/background dist/background 2>/dev/null || true
cp assets/favicon.png dist/favicon.png 2>/dev/null || true
cp assets/playground.html dist/playground.html 2>/dev/null || true
cp assets/manifest.json dist/manifest.json 2>/dev/null || true
cp assets/config.html dist/config.html 2>/dev/null || true
cp assets/debug-inputs.html dist/debug-inputs.html 2>/dev/null || true
cp assets/loading-bg.jpg dist/loading-bg.jpg 2>/dev/null || true

# Copy entity textures
cp -r node_modules/mc-assets/dist/other-textures/latest/entity dist/textures/entity 2>/dev/null || true

# Copy config
cp config.json dist/config.json 2>/dev/null || true

# Build mesher worker
echo "=== Building mesher worker ==="
node renderer/buildMesherWorker.mjs 2>/dev/null || echo "mesher build skipped"

echo "=== Running rsbuild build ==="
npx rsbuild build

echo "=== Build complete ==="
ls -la dist/
