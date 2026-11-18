# Conventions de travail — Portfolio (API et admin)

API NestJS (`backend/`, conteneur `portfolio-api`, port 3001, préfixe `/api/v1`), admin Next.js (`admin/`, `portfolio-admin`), MongoDB (`portfolio-mongo`, réseau privé, sans authentification) et médias sur le volume `backend_uploads` (`/app/uploads`). Le site public est le dépôt Portfolio-Web.

Mêmes règles que le dépôt FindUrJob, adaptées à ce projet. L'infrastructure
du VPS (Prometheus, Grafana, MinIO, nginx, entretien de la machine) vit dans
le dépôt **Infrastructure** : rien de tout cela ne s'ajoute ici.

## Git

- **Développer sur `dev`.** Jamais de commit direct sur `main`.
- **Toujours ouvrir une pull request `dev` → `main` en fin de tâche**, sans
  attendre qu'on la demande. C'est Kévine qui fusionne, jamais l'assistant.
- Ne jamais créer d'autre branche pour la PR : toujours `dev`.
- Le déploiement (`build-and-push.yml` puis `deploy.yml`) ne part **que** d'un push sur `main` : tant que la PR n'est pas fusionnée, rien n'est livré. Un correctif pas encore visible en production est normal.
- `dev` peut avoir été fusionnée pendant qu'on travaillait : vérifier l'état de
  `main` avant d'ouvrir une PR. Une PR fusionnée est close, elle ne se
  réutilise pas : repartir de `main`.
- Messages de commit et titres de PR en anglais, corps en français.

## Avant de proposer un correctif

- **Regarder ce que `main` contient déjà.** Le dépôt avance en parallèle.
- Aucune base de données ni service de production n'est joignable depuis un
  environnement de développement distant : extraire des **fonctions pures** et
  les éprouver, ou monter les tests sur une base jetable. Le dire quand une
  vérification n'est pas possible, plutôt que d'affirmer.
- **Les tests** : `cd backend && npm ci --legacy-peer-deps && npm run typecheck && npx jest --ci (intégration MongoDB : MONGO_URI_TEST) ; cd admin && npm ci --legacy-peer-deps && npm run typecheck && npm test ; bash tests/sauvegarde.test.sh`. Ils doivent tous passer avant d'ouvrir ou de
  mettre à jour une PR. La CI (`.github/workflows/ci.yml`) les relance sur
  chaque PR et chaque push sur `dev` : ne jamais annoncer une PR prête sans
  sa coche verte, et lire le journal quand elle est rouge.
- Ne jamais sauter, désactiver ou affaiblir un test pour passer au vert.
- Tout bug corrigé ajoute son test — un test qui échouait avant la correction.

## Supervision et sauvegardes

- **Métriques** : `GET /api/v1/metrics` sur `portfolio-api:3001` : `http_requests_total` et `http_request_duration_seconds` {method, route, status_code} (`src/metrics/metrics.interceptor.ts`, route = modèle Nest, jamais l'URL brute) ; `GET /api/metrics` sur `portfolio-admin:3000` (processus Node) ; MongoDB via `mongodb-exporter-portfolio:9216`. Prometheus (dépôt Infrastructure) les lit
  par le réseau Docker `web` : ne changer ni le nom du conteneur, ni le port,
  ni le chemin sans mettre à jour `monitoring/prometheus/prometheus.yml` dans
  Infrastructure. Un test vérifie que la route répond.
- **Sauvegardes** : Deux choses à garder ensemble : la base MongoDB `portfolio` et le volume des médias (`/app/uploads`). La base seule donne des images cassées. `BACKUP_FICHIERS=0` sauvegarde la base seule. `scripts/backup.sh` écrit **un**
  fichier dans `$BACKUP_DIR` (défaut `backups/<horodatage>/`) et donne son
  chemin en dernière ligne ; `scripts/restore.sh <fichier>` le recharge. La
  sauvegarde automatique vers MinIO est faite par le dépôt Infrastructure,
  qui retrouve les conteneurs de base par leur image et leurs variables
  standard (`POSTGRES_*`, `MONGO_INITDB_*`, `MYSQL_*`) : ne pas les renommer.
- Lancer `scripts/backup.sh` avant toute manipulation risquée (migration,
  `down -v`, changement d'URL de base). Une base perdue ne se reconstitue pas.

## Skills

- `.claude/skills/revue-quotidienne/SKILL.md` : la revue des erreurs des
  dernières 24 h, corrigées avec un test, PR sur `dev`, rapport.
- `.claude/skills/sauvegarde-restauration/SKILL.md` : sauvegarder, restaurer,
  revenir en arrière après un déploiement raté.

## Style

- Code et commentaires en **français**. Les commentaires
  expliquent le *pourquoi* — souvent le bug passé qui justifie la ligne — pas
  le *quoi*.
- Aucun secret dans le dépôt : `.env.example` porte les clés, jamais les
  valeurs.
