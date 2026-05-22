#!/bin/bash
set -euo pipefail

PLUGIN_NAME="tribe-x-persona-studio"
ZIP_NAME="${PLUGIN_NAME}.zip"
RELEASE_DIR="release"
BUILD_DIR=".build"
REPO_URL="https://github.com/DeeJanuz/tribe-x-persona-studio"

echo "Building ${ZIP_NAME}..."

rm -rf "${RELEASE_DIR}" "${BUILD_DIR}"
mkdir -p "${RELEASE_DIR}"
mkdir -p "${BUILD_DIR}/renderers" "${BUILD_DIR}/tools"

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
DOWNLOAD_URL="${REPO_URL}/releases/download/${VERSION}/${ZIP_NAME}"

python3 -c "
import json
from pathlib import Path

path = Path('manifest.json')
manifest = json.loads(path.read_text())
manifest['download_url'] = '${DOWNLOAD_URL}'
path.write_text(json.dumps(manifest, indent=2) + '\n')
print('  Updated source manifest download_url')
"

cp manifest.json "${BUILD_DIR}/manifest.json"
cp renderers/persona-lab.js "${BUILD_DIR}/renderers/persona-lab.js"
cp tools/relay-probe-server.mjs "${BUILD_DIR}/tools/relay-probe-server.mjs"
cp tools/relay-probe-executors.mjs "${BUILD_DIR}/tools/relay-probe-executors.mjs"

echo "  Version: ${VERSION}"
echo "  Download URL: ${DOWNLOAD_URL}"

cd "${BUILD_DIR}"
zip -r "../${RELEASE_DIR}/${ZIP_NAME}" manifest.json renderers/ tools/
cd ..

rm -rf "${BUILD_DIR}"

echo "Built ${RELEASE_DIR}/${ZIP_NAME} ($(du -h "${RELEASE_DIR}/${ZIP_NAME}" | cut -f1))"
