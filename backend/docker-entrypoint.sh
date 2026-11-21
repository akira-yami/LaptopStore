#!/bin/sh
set -eu

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"
chown spring:spring "$UPLOAD_DIR"

exec su-exec spring java -XX:MaxRAMPercentage=75 -jar /app/app.jar
