#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "Building SoberTuner..."
npm run build
echo "Patching dist/index.html..."
sed -i 's/ crossorigin//g' dist/index.html
echo "Launching..."
exec electron38 electron/main.cjs --no-sandbox --in-process-gpu --disable-gpu-compositing --disable-software-rasterizer
