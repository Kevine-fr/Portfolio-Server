#!/usr/bin/env bash
# Restaure une sauvegarde faite par scripts/backup.sh (base, puis médias s'ils
# sont dans l'archive).
#
#   ./scripts/backup.sh                       # l'état actuel, d'abord
#   ./scripts/restore.sh backups/<horodatage>/portfolio-<horodatage>.tar
set -euo pipefail

FICHIER="${1:?Usage : restore.sh <portfolio-AAAAMMJJ-HHMMSS.tar>}"
DB_CONTAINER="${PORTFOLIO_DB_CONTAINER:-portfolio-mongo}"
API_CONTAINER="${PORTFOLIO_API_CONTAINER:-portfolio-api}"
[ -s "$FICHIER" ] || { echo "Archive introuvable ou vide : $FICHIER" >&2; exit 1; }
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
tar xf "$FICHIER" -C "$TRAVAIL"

echo "Base : mongorestore --drop dans $DB_CONTAINER…" >&2
# --drop : chaque collection est remplacée, pas fusionnée avec l'existant.
docker exec -i "$DB_CONTAINER" mongorestore --quiet --drop --archive --gzip < "$TRAVAIL/base.archive.gz"

if [ -f "$TRAVAIL/uploads.tar" ]; then
  echo "Médias : restauration dans $API_CONTAINER:/app/uploads…" >&2
  docker exec -i "$API_CONTAINER" tar xf - -C /app/uploads < "$TRAVAIL/uploads.tar"
fi
echo "✓ Restauré." >&2
