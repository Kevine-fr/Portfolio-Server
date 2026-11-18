#!/usr/bin/env bash
# Épreuve du contrat de sauvegarde, sans Docker : un faux `docker` simule les
# conteneurs (mongodump/mongorestore/tar) dans un dossier temporaire.
#   bash tests/sauvegarde.test.sh
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/medias" "$T/base"
cat > "$T/bin/docker" <<'FAUX'
#!/usr/bin/env bash
shift; [ "$1" = "-i" ] && shift; shift
case "$*" in
  *mongodump*) cat "$FAUX/base/dump" ;;
  *mongorestore*) cat > "$FAUX/base/dump" ;;
  *"tar cf"*) tar cf - -C "$FAUX/medias" . ;;
  *"tar xf"*) tar xf - -C "$FAUX/medias" ;;
  *) echo "faux docker : commande inattendue $*" >&2; exit 2 ;;
esac
FAUX
chmod +x "$T/bin/docker"
export PATH="$T/bin:$PATH" FAUX="$T" BACKUP_DIR="$T/sauvegardes"

echo "projets" > "$T/base/dump"
echo "image" > "$T/medias/photo.webp"

ARCHIVE="$(bash "$RACINE/scripts/backup.sh" 2>/dev/null | tail -n1)"
[ -s "$ARCHIVE" ] || { echo "ÉCHEC : pas d'archive ($ARCHIVE)"; exit 1; }

echo "abîmé" > "$T/base/dump"; rm "$T/medias/"*
bash "$RACINE/scripts/restore.sh" "$ARCHIVE" 2>/dev/null
grep -q projets "$T/base/dump" || { echo "ÉCHEC : base non restaurée"; exit 1; }
grep -q image "$T/medias/photo.webp" || { echo "ÉCHEC : médias non restaurés"; exit 1; }

: > "$T/base/dump"
if bash "$RACINE/scripts/backup.sh" >/dev/null 2>&1; then echo "ÉCHEC : un dump vide passe pour une sauvegarde"; exit 1; fi
echo "✓ sauvegarde/restauration : contrat tenu"
