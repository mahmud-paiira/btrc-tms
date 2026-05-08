#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/opt/brtc-tms/backups}"
DB_NAME="${DB_NAME:-brtc_tms}"
DB_USER="${DB_USER:-brtc_user}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
LATEST_LINK="${BACKUP_DIR}/latest.sql.gz"

# Cloud storage (optional — supports rclone remotes)
CLOUD_ENABLED="${CLOUD_ENABLED:-false}"
CLOUD_DEST="${CLOUD_DEST:-s3:brtc-backups}"
CLOUD_RCLONE_CONFIG="${CLOUD_RCLONE_CONFIG:-/etc/rclone.conf}"

# Healthcheck URL (optional)
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"

# ── Setup ───────────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"
export PGPASSWORD="${DB_PASSWORD}"

# ── Backup PostgreSQL ───────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of ${DB_NAME}..."

pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --verbose \
    --no-owner \
    --no-acl \
    --format=custom \
    --file="${BACKUP_FILE}" 2>&1 | grep -v "^$"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed: ${BACKUP_FILE}"

# Create compressed SQL dump as well for easy restore
pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}_sql.gz"

# Update latest symlink
ln -sf "${BACKUP_FILE}" "${LATEST_LINK}"

# ── Backup size ─────────────────────────────────────────────────────────────
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup size: ${BACKUP_SIZE}"

# ── Upload to cloud storage ─────────────────────────────────────────────────
if [[ "${CLOUD_ENABLED}" == "true" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to cloud storage..."

    if rclone --config "${CLOUD_RCLONE_CONFIG}" copy \
        "${BACKUP_FILE}" \
        "${CLOUD_DEST}/daily/" \
        2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloud upload successful"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Cloud upload failed" >&2
    fi
fi

# ── Rotate old backups ──────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -maxdepth 1 -name "${DB_NAME}_*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete

# Report counts
DAILY_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${DAILY_COUNT} daily backups retained"

# ── Ping healthcheck ────────────────────────────────────────────────────────
if [[ -n "${HEALTHCHECK_URL}" ]]; then
    curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}" > /dev/null 2>&1 || true
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully"
