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
- [ ] HTTPS via reverse proxy (Nginx/Traefik/Caddy)
- [ ] `CORS_ORIGIN` configuré avec les vrais domaines
- [ ] MongoDB avec auth (user dédié, pas root)
- [ ] Backups MongoDB programmés
