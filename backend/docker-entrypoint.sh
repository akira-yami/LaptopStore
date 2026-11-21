#!/bin/sh
set -eu

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR/products"

if [ -d /app/seed-uploads/products ]; then
  for f in /app/seed-uploads/products/*; do
    [ -f "$f" ] || continue
    base="$(basename "$f")"
    [ -e "$UPLOAD_DIR/products/$base" ] || cp "$f" "$UPLOAD_DIR/products/$base"
  done
fi

chown -R spring:spring "$UPLOAD_DIR"

exec su-exec spring java -XX:MaxRAMPercentage=75 -jar /app/app.jar
