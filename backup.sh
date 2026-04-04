#!/bin/bash
# ============================================================
#  Math STAAR Test Prep – Backup Script
#  Creates a timestamped .tar.gz in the project root,
#  excluding node_modules and previous backup archives.
# ============================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP_NAME="math-staar-ishaan-${TIMESTAMP}.tar.gz"
BACKUP_PATH="${PROJECT_DIR}/${BACKUP_NAME}"

echo "📦  Starting backup…"
echo "    Project : ${PROJECT_DIR}"
echo "    Archive : ${BACKUP_NAME}"

tar -czf "${BACKUP_PATH}" \
    -C "$(dirname "${PROJECT_DIR}")" \
    --exclude='node_modules' \
    --exclude='*.tar.gz' \
    --exclude='.git' \
    --exclude='client/public/dinos' \
    "$(basename "${PROJECT_DIR}")"

SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "✅  Backup complete → ${BACKUP_PATH} (${SIZE})"
