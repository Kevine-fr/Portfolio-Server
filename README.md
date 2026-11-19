# Portfolio Stack — Kevine Fray

API NestJS et interface d'administration Next.js qui alimentent le portfolio : projets synchronisés depuis GitHub (README et `.portfolio.yml`), compétences, expériences et médias.

Stack full pour le portfolio :
- **Backend NestJS** (API REST, MongoDB, JWT)
- **Admin Next.js** (shadcn/ui, mode clair/sombre, français, mobile-first)
- **MongoDB** (persistance)

---

## Architecture

```
portfolio-stack/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/            # JWT (login, /me, guards)
│   │   ├── modules/         # 7 modules CRUD
│   │   │   ├── users/  projects/  skills/  experiences/
│   │   │   ├── education/  tags/  contacts/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
│
├── admin/                    # Next.js 14 admin panel (shadcn/ui)
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── login/  dashboard/  projects/  skills/
│   │   │   ├── experiences/  education/  tags/
│   │   │   ├── contacts/  users/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components (Button, Card, Dialog, …)
│   │   │   ├── layout/      # AdminShell, SidebarNav, ThemeToggle, UserMenu
│   │   │   └── forms/       # Forms react-hook-form + zod
│   │   ├── lib/             # api.ts, auth.ts, utils.ts (cn)
│   │   ├── hooks/           # use-media-query
│   │   └── styles/          # globals.css (HSL vars shadcn)
│   ├── Dockerfile
│   └── package.json
│
├── .devcontainer/devcontainer.json
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## Lancement rapide

### 1. Configurer

```bash
cp .env.example .env
# Édite .env :
#   JWT_SECRET (génère avec : openssl rand -hex 64)
#   ADMIN_BOOTSTRAP_PASSWORD
```

### 2. Lancer

```bash
docker compose up -d
docker compose logs -f backend admin
```

Un compte admin est créé au premier lancement avec les identifiants de `.env`.

### 3. Accès

| Service       | URL                                | Description                  |
|---------------|------------------------------------|------------------------------|
| Admin         | http://localhost:3000              | Panneau Next.js              |
| API           | http://localhost:3001/api/v1       | Endpoints REST               |
| Swagger       | http://localhost:3001/api/docs     | Documentation interactive    |
| MongoDB       | mongodb://localhost:27017          |                              |

### 4. Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Admin : ce qui est dans la v2 (shadcn/ui)

- **shadcn/ui** intégré directement (sans CLI) : Button, Card, Dialog, AlertDialog, Sheet, Select, Checkbox, Avatar, DropdownMenu, Table, Badge, Skeleton, Separator, Label, Textarea, Input
- **Mode clair / sombre / système** avec toggle dans la topbar (next-themes)
- **Palette zinc neutre**, intemporelle et pro
- **Tout en français** : labels, placeholders, messages d'erreur, toasts, dates (date-fns/fr)
- **Toasts** : sonner avec colors riches + bouton close
- **Animations** : fade-in, scale-in, slide-in, transitions de page
- **Mobile-first responsive** :
  - Sidebar fixe sur desktop (lg+), drawer (Sheet) sur mobile via burger menu
  - Tables sur desktop, cards stack sur mobile
  - Modals adaptés (scrollable, sm:rounded-lg)
  - Boutons et actions adaptés
- **Lucide icons** partout pour la cohérence
- **Compteur live** des messages non lus dans la sidebar (refetch 30 s)

### Pages admin (toutes en français)

| Route          | Page                  | Composants spéciaux              |
|----------------|-----------------------|----------------------------------|
| `/login`       | Connexion             | Card centrée, animation fade     |
| `/dashboard`   | Tableau de bord       | Stat cards, messages récents     |
| `/projects`    | Projets               | Formulaire à onglets + uploads médias |
| `/skills`      | Compétences           | Grouped par catégorie, icône uploadable |
| `/experiences` | Expériences           | Cards timeline + techStack dynamique |
| `/education`   | Formation             | Cards                            |
| `/tags`        | Étiquettes            | Création inline + color picker   |
| `/contacts`    | Messages              | Inbox filtrable + dialog lecture |
| `/users`       | Utilisateurs (admin)  | Table desktop / cards mobile     |

### Médias et uploads

Tous les médias sont **uploadés directement** depuis l'admin (drag-drop ou clic) :

- **Image de couverture** des projets (upload single, aperçu)
- **Galerie** d'un projet : jusqu'à **30 images** avec réorganisation (flèches) et suppression
- **Vidéo de démo** d'un projet (facultative) : MP4, WebM ou MOV, 100 Mo max
- **Icônes** des compétences (upload single compact)

Stockage backend dans `/app/uploads` (volume Docker `backend_uploads`), exposés en statique sur `/uploads/*`. Limites : 10 Mo images, 100 Mo vidéos. Endpoint `POST /api/v1/uploads/{image|video}` (JWT requis).

### Technologies dynamiques

Le champ « Technologies » d'un projet ou d'une expérience est un **multi-select alimenté par vos Compétences enregistrées**, groupé par catégorie (Frontend / Backend / Outils / Design / Autre) avec recherche. Les compétences héritées d'anciennes saisies libres sont conservées et signalées.

---

## Synchronisation GitHub

Le portfolio peut se remplir **directement depuis votre compte GitHub** : vous travaillez sur vos dépôts comme d'habitude, la synchronisation met à jour projets, compétences, expériences, formations et « À propos ».

### Mise en route (5 minutes)

1. **(Recommandé) Créez un jeton GitHub en lecture seule** : *Settings → Developer settings → Fine-grained tokens*, accès « Public repositories (read-only) ».
   Sans jeton l'API est limitée à 60 requêtes/heure ; avec un jeton, 5000.
2. Renseignez les variables du backend (`.env` ou secrets de déploiement) :
   ```env
   GITHUB_USERNAME=Kevine-fr     # compte par défaut (modifiable depuis l'admin)
   GITHUB_TOKEN=github_pat_...   # facultatif mais recommandé — jamais stocké en base
   ```
   En production, créez les secrets GitHub Actions `PORTFOLIO_GITHUB_USERNAME` et `PORTFOLIO_GITHUB_TOKEN`
   (GitHub interdit les noms de secrets commençant par `GITHUB_`) : `deploy.yml` les écrit dans le `.env` du VPS.
3. Dans l'admin, ouvrez **GitHub** (menu de gauche), vérifiez l'identifiant et cliquez **Synchroniser maintenant**.

### Choisir les dépôts affichés

- **Topic automatique** : ajoutez le topic `portfolio` (configurable) à un dépôt sur GitHub → il apparaît au prochain passage.
- **Sélection manuelle** : cochez / décochez un dépôt dans la liste de la page GitHub (l'exclusion l'emporte sur le topic).
- Les forks, dépôts privés et le dépôt de profil sont ignorés par défaut.
- Un dépôt qui n'est plus sélectionné disparaît du portfolio. Un projet créé à la main puis relié à GitHub (même `repoUrl`)
  redevient un projet manuel au lieu d'être supprimé.

### Ce qui est récupéré

| Donnée portfolio        | Source GitHub                                                                         |
|-------------------------|----------------------------------------------------------------------------------------|
| Titre                   | `.portfolio.yml` › titre `# H1` du README › nom du dépôt (« my-app » → « My App »)       |
| Description             | `.portfolio.yml` › description du dépôt › premier paragraphe du README                   |
| Page détaillée          | README (ou le fichier `content:`) rendu en HTML **sanitisé**, liens/images relatifs résolus |
| Couverture              | `cover:` › image importée dans l'admin › 1ʳᵉ image du README (hors badges) › carte GitHub |
| Technologies            | `techStack:` › langages principaux (≥ 5 %) + topics reconnus (react, nestjs, docker…)   |
| Lien « Voir en ligne »  | `liveUrl:` › champ *Website* du dépôt                                                    |
| Statut / année          | `status:` / `year:` › dépôt archivé → `archived` / année de création                     |
| Étoiles, langages…      | statistiques du dépôt (affichées sur la page projet)                                      |
| Compétences             | langages pondérés par volume de code + topics, ou liste explicite du profil              |
| À propos / expériences / formations | `.portfolio.yml` du dépôt de profil `<identifiant>/<identifiant>`           |

Les champs **sous-titre, galerie, vidéo, mise en avant et ordre** restent modifiables dans l'admin (sauf s'ils sont définis
dans `.portfolio.yml`). Les contenus saisis manuellement ne sont **jamais** modifiés ni supprimés par la synchronisation.
Un projet peut être **détaché** (bouton « Synchronisé / Détaché ») pour être édité librement dans l'admin.

### `.portfolio.yml` (facultatif)

À la racine d'un dépôt (`.portfolio.yml`, `.yaml` ou `.json`) :

```yaml
title: Portfolio 3D
subtitle: Site personnel immersif
description: Voyage cosmique en Three.js entre les sections du CV.
content: docs/PORTFOLIO.md   # page détaillée (README par défaut)
cover: docs/cover.png        # chemin dans le dépôt ou URL
gallery: [docs/screen-1.png, docs/screen-2.png]
techStack: [React, Three.js, Vite]
liveUrl: https://kevinefray.dev
featured: true
order: 1
status: published            # published | draft | archived
hidden: false                # true = ne jamais afficher ce dépôt
```

Dans le dépôt de profil (`Kevine-fr/Kevine-fr`) :

```yaml
about:
  tagline: Expériences web immersives…
  roles: [Développeur Full-Stack, Creative Developer]
  bio: Passionné par le **design** et la **3D**.
  cv: docs/cv.pdf
skills:
  - { name: React, category: frontend, level: 90 }
experiences:
  - { title: Développeur Full-Stack, company: Freelance, startDate: 2024-01, endDate: present, techStack: [React, NestJS] }
education:
  - { school: École Supérieure, degree: Master, field: Architecture logicielle, startDate: 2023-09, endDate: 2025-06 }
```

Les erreurs de syntaxe ou clés inconnues apparaissent dans le **rapport de synchronisation** de la page GitHub.

### Fréquence

La synchronisation automatique tourne par défaut **toutes les heures** (réglable de 15 min à 24 h, ou désactivable).
Les réponses GitHub inchangées sont mises en cache (ETag) pour économiser le quota.

---

## API — endpoints publics (consommés par le portfolio)

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/projects`               | Liste des projets                    |
| GET    | `/projects/slug/:slug`    | Détail projet                        |
| GET    | `/skills`                 | Liste des compétences                |
| GET    | `/experiences`            | Liste des expériences                |
| GET    | `/education`              | Liste éducation                      |
| GET    | `/tags`                   | Liste des étiquettes                 |
| GET    | `/about`                  | Contenu Hero / À propos              |
| GET    | `/health`                 | Liveness (utilisé par les healthchecks) |
| POST   | `/contacts`               | Envoi formulaire (rate-limited 5/min)|

`GET /projects?summary=true` renvoie une liste allégée (sans le contenu long) ; `GET /projects/slug/:slug` renvoie le détail avec `contentHtml` (Markdown/README rendu et sanitisé).

## API — endpoints protégés (JWT Bearer)

| Method | Endpoint                  |
|--------|---------------------------|
| POST   | `/auth/login` (public, limité à 10 essais/min) |
| GET    | `/auth/me`                |
| POST   | `/uploads/image`          |
| POST   | `/uploads/video`          |
| DELETE | `/uploads/:filename`      |
| POST/PATCH/DELETE | `/projects`, `/skills`, `/experiences`, `/education`, `/tags` |
| GET/PATCH/DELETE  | `/contacts`        |
| GET    | `/contacts/unread-count`  |
| Tout   | `/users` (admin uniquement) |
| GET/PUT | `/github/settings` (PUT : admin) |
| GET    | `/github/repos`, `/github/status` |
| PUT    | `/github/repos/:name/selection`, `/github/projects/:id/auto-sync` |
| POST   | `/github/sync`            |

---

## Connecter le portfolio Vite au backend

Voir `SectionContact.example.jsx` qui POST sur `/contacts`.
Ajoute dans `cv-3d/.env.local` :
```
VITE_API_URL=http://localhost:3001/api/v1
```

---

## Tests

```bash
cd backend && npm test          # unitaires + e2e HTTP (store en mémoire, sans MongoDB)
MONGO_URI_TEST=mongodb://localhost:27017/portfolio_test npm test   # + intégration MongoDB réel
cd admin && npm test            # Vitest + Testing Library
```

La CI (`.github/workflows/ci.yml`) lance typecheck, tests (dont l'intégration sur un service `mongo:7`) et builds
à chaque pull request.

---

## Commandes utiles

```bash
docker compose logs -f backend admin
docker compose exec backend sh
docker compose exec mongo mongosh portfolio
docker compose down -v          # reset DB
docker compose up -d --build    # rebuild
```

---

## Sécurité — checklist production

- [ ] `JWT_SECRET` régénéré (`openssl rand -hex 64`)
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` fort
- [ ] HTTPS via reverse proxy (Traefik dans la config fournie)
- [ ] `CORS_ORIGIN` configuré avec les vrais domaines
- [ ] MongoDB avec auth si exposé (pas le cas par défaut — interne seulement)
- [ ] Backups MongoDB et volume `backend_uploads` programmés
- [ ] `GITHUB_TOKEN` limité à la lecture des dépôts publics (fine-grained token)

---

## Déploiement production (VPS + Traefik + DockerHub)

### Architecture

| Composant | Domaine | Image |
|---|---|---|
| Portfolio Vite | `kevinefray.dev` | (existant) `zstin4/web-portfolio` |
| Admin Next.js | `admin.kevinefray.dev` | `zstin4/portfolio-admin` |
| API NestJS + uploads | `api.kevinefray.dev` | `zstin4/portfolio-api` |
| MongoDB | (interne) | `mongo:7` |

Adapte ces domaines à tes secrets GitHub.

### Pré-requis sur le VPS

1. **Traefik** déjà en place, écoute le réseau Docker externe `web` (déjà ton cas).
2. **DNS** : ajoute deux A-records `admin` et `api` pointant sur l'IP du VPS.
3. **Crée le dossier de déploiement** et clone le repo :
   ```bash
   mkdir -p ~/deploy && cd ~/deploy
   git clone git@github.com:<toi>/Portfolio-Admin.git
   cd Portfolio-Admin
   ```

### Secrets GitHub à créer

Dans **Settings → Secrets and variables → Actions** du repo :

| Secret | Exemple / valeur |
|---|---|
| `DOCKERHUB_USERNAME` | `zstin4` |
| `DOCKERHUB_TOKEN` | token DockerHub (write) |
| `VPS_HOST` | `vps.kevinefray.dev` ou IP |
| `VPS_USERNAME` | `kevine` |
| `VPS_SSH_KEY` | clé privée SSH (multi-ligne) |
| `NEXT_PUBLIC_API_URL` | `https://api.kevinefray.dev/api/v1` |
| `API_DOMAIN` | `api.kevinefray.dev` |
| `ADMIN_DOMAIN` | `admin.kevinefray.dev` |
| `PORTFOLIO_DOMAIN` | `kevinefray.dev` (pour CORS) |
| `CERT_RESOLVER` | nom du certresolver Traefik (souvent `letsencrypt`) |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `ADMIN_BOOTSTRAP_EMAIL` | `admin@kevinefray.dev` |
| `ADMIN_BOOTSTRAP_PASSWORD` | mot de passe fort |
| `PORTFOLIO_GITHUB_USERNAME` | (facultatif) compte GitHub synchronisé, ex. `Kevine-fr` |
| `PORTFOLIO_GITHUB_TOKEN` | (facultatif, recommandé) jeton GitHub en lecture seule |

### Repos DockerHub à créer

- `zstin4/portfolio-api` (public ou privé)
- `zstin4/portfolio-admin` (idem)

### Première mise en route

1. **Push sur `main`** : la CI build les deux images en parallèle (matrix), tag `prod-vX.Y.Z`, puis le workflow `Deploy Production` se déclenche automatiquement via `workflow_run`.

2. **Premier deploy** : sur le VPS, le workflow va `git pull` la dernière version, générer le `.env` depuis les secrets, puis `docker compose pull && up -d`. Le bootstrap admin (`ADMIN_BOOTSTRAP_*`) crée le premier compte au démarrage.

3. **Vérifie** :
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs -f backend admin
   curl https://api.kevinefray.dev/api/v1/projects   # doit répondre []
   ```

### Workflow CI/CD

- **`build-and-push.yml`** (sur push main)
  - Bump `vX.Y.Z` automatique depuis le dernier tag
  - Push deux images : `portfolio-api` et `portfolio-admin` taguées `prod-vX.Y.Z` + `latest`
  - Cache buildx via tag `:buildcache` pour accélérer les rebuilds
- **`deploy.yml`** (sur `workflow_run` success)
  - SSH sur le VPS, `git reset --hard origin/main`, regénère `.env`, `docker compose pull && up -d`

### Backup recommandé

```bash
# MongoDB
docker exec portfolio-mongo mongodump --archive=/tmp/dump.archive
docker cp portfolio-mongo:/tmp/dump.archive ./backups/mongo-$(date +%F).archive

# Uploads (médias)
docker run --rm -v portfolio-admin_backend_uploads:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

À mettre dans un cron sur le VPS, plus un offsite (S3, Backblaze, etc.).

### Rollback

```bash
ssh kevine@vps "cd ~/deploy/Portfolio-Admin && \
  sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=prod-vX.Y.Z/' .env && \
  docker compose -f docker-compose.prod.yml pull && \
  docker compose -f docker-compose.prod.yml up -d"
```

---

## Tests, métriques et sauvegardes

- Tests : `cd backend && npx jest` (+ `MONGO_URI_TEST` pour l'intégration), `cd admin && npm test`, `bash tests/sauvegarde.test.sh`. La CI (`ci.yml`) les relance sur chaque PR.
- **Métriques Prometheus** : `GET /api/v1/metrics` (API : `http_requests_total`, `http_request_duration_seconds` par route) et `GET /api/metrics` (admin).
- **Sauvegarde** : `./scripts/backup.sh` (mongodump + médias, une archive) ; `./scripts/restore.sh <archive>`. Les envois automatiques vers MinIO sont faits par le dépôt Infrastructure.
- Conventions de travail : `CLAUDE.md`.
