# Portfolio Stack — Kevine Fray

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

## API — endpoints publics (consommés par le portfolio)

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/projects`               | Liste des projets                    |
| GET    | `/projects/slug/:slug`    | Détail projet                        |
| GET    | `/skills`                 | Liste des compétences                |
| GET    | `/experiences`            | Liste des expériences                |
| GET    | `/education`              | Liste éducation                      |
| GET    | `/tags`                   | Liste des étiquettes                 |
| POST   | `/contacts`               | Envoi formulaire (rate-limited 5/min)|

## API — endpoints protégés (JWT Bearer)

| Method | Endpoint                  |
|--------|---------------------------|
| POST   | `/auth/login`             |
| GET    | `/auth/me`                |
| POST   | `/uploads/image`          |
| POST   | `/uploads/video`          |
| DELETE | `/uploads/:filename`      |
| POST/PATCH/DELETE | `/projects`, `/skills`, `/experiences`, `/education`, `/tags` |
| GET/PATCH/DELETE  | `/contacts`        |
| GET    | `/contacts/unread-count`  |
| Tout   | `/users` (admin uniquement) |

---

## Connecter le portfolio Vite au backend

Voir `SectionContact.example.jsx` qui POST sur `/contacts`.
Ajoute dans `cv-3d/.env.local` :
```
VITE_API_URL=http://localhost:3001/api/v1
```

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
docker exec portfolio_mongo mongodump --archive=/tmp/dump.archive
docker cp portfolio_mongo:/tmp/dump.archive ./backups/mongo-$(date +%F).archive

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
