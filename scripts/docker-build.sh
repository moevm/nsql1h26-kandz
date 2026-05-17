#!/bin/sh

set -eu

images="
python:3.12.8-slim
node:22.13.1-alpine3.21
nginx:1.27.3-alpine3.20
mongo:7.0.16
"

retry() {
  label="$1"
  shift
  attempt=1

  while [ "$attempt" -le 5 ]; do
    echo "[$attempt/5] $label"
    if "$@"; then
      return 0
    fi

    if [ "$attempt" -eq 5 ]; then
      return 1
    fi

    sleep_seconds=$((attempt * 5))
    sleep "$sleep_seconds"
    attempt=$((attempt + 1))
  done
}

for image in $images; do
  retry "docker pull $image" docker pull "$image"
done

if [ "${1:-}" = "--no-cache" ]; then
  docker compose build --no-cache
else
  docker compose build
fi
