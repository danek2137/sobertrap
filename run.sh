#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SOBERTUNER_BUILD_DIR:-$ROOT_DIR/build}"
BUILD_TYPE="${CMAKE_BUILD_TYPE:-Release}"
BUILD_JOBS="${CMAKE_BUILD_JOBS:-2}"

cmake -S "$ROOT_DIR" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE="$BUILD_TYPE"
cmake --build "$BUILD_DIR" --target sobertrap --parallel "$BUILD_JOBS"
exec "$BUILD_DIR/sobertrap" "$@"
