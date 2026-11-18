#!/usr/bin/env bash
# Sauvegarde du Portfolio : la base MongoDB ET les médias téléversés.
#
#   ./scripts/backup.sh                    -> backups/<horodatage>/portfolio-<horodatage>.tar
#   BACKUP_DIR=/srv/sauvegardes ./scripts/backup.sh
#   BACKUP_FICHIERS=0 ./scripts/backup.sh  -> la base seule (les vidéos pèsent lourd)
#
# Contrat commun aux dépôts du VPS (le dépôt Infrastructure envoie les
# sauvegardes sur MinIO) : un seul fichier écrit, son chemin en DERNIÈRE ligne
# de la sortie standard, les messages sur la sortie d'erreur.
#
# Les projets, compétences, etc. pointent vers des images de /app/uploads :
# restaurer la base sans les médias donne des pages aux images cassées.
set -euo pipefail

DB_CONTAINER="${PORTFOLIO_DB_CONTAINER:-portfolio-mongo}"
API_CONTAINER="${PORTFOLIO_API_CONTAINER:-portfolio-api}"
DB="${MONGO_DB:-portfolio}"
STAMP="$(date +%Y%m%d-%H%M%S)"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$RACINE/backups/$STAMP}"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
mkdir -p "$DEST"
FICHIER="$DEST/portfolio-$STAMP.tar"

echo "Base : mongodump de « $DB » depuis $DB_CONTAINER…" >&2
docker exec "$DB_CONTAINER" mongodump --quiet --db "$DB" --archive --gzip > "$TRAVAIL/base.archive.gz"
[ -s "$TRAVAIL/base.archive.gz" ] || { echo "Échec : dump de la base vide." >&2; exit 1; }

if [ "${BACKUP_FICHIERS:-1}" != "0" ]; then
  echo "Médias : archive de /app/uploads depuis $API_CONTAINER…" >&2
  docker exec "$API_CONTAINER" tar cf - -C /app/uploads . > "$TRAVAIL/uploads.tar"
fi

tar cf "$FICHIER.part" -C "$TRAVAIL" .
mv "$FICHIER.part" "$FICHIER"
echo "✓ $(du -h "$FICHIER" | cut -f1)" >&2
echo "$FICHIER"
