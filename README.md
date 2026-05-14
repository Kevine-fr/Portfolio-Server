# Portfolio Stack — Kevine Fray

Full stack admin pour le portfolio cosmique :
- **Backend NestJS** (API REST, MongoDB, JWT auth)
- **Admin Next.js** (App Router, Tailwind palette portfolio)
- **MongoDB** (persistance)

Le portfolio Vite/Three.js existant (dossier `cv-3d`) consomme la même API via les endpoints publics.

---

## Architecture

```
portfolio-stack/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/            # JWT auth (login, /me, guards)
│   │   ├── modules/         # 7 modules CRUD
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   ├── skills/
│   │   │   ├── experiences/
│   │   │   ├── education/
│   │   │   ├── tags/
│   │   │   └── contacts/
│   │   ├── app.module.ts
│   │   └── main.ts          # Boot + Swagger + CORS + Helmet
│   ├── Dockerfile           # Multi-stage (dev / runner)
│   └── package.json
│
├── admin/                    # Next.js 14 admin panel
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── skills/
│   │   │   ├── experiences/
│   │   │   ├── education/
│   │   │   ├── tags/
│   │   │   ├── contacts/
│   │   │   └── users/
│   │   ├── components/      # UI + layout + forms
│   │   ├── lib/             # API client + auth store
│   │   ├── types/           # Shared TS types
│   │   └── styles/          # Global CSS + Tailwind tokens
│   ├── Dockerfile
│   └── package.json
│
├── .devcontainer/
│   └── devcontainer.json    # VS Code remote container config
├── docker-compose.yml       # Dev orchestration (default)
├── docker-compose.prod.yml  # Production overrides
└── .env.example
```

---

## Lancement rapide

### 1. Configurer les variables d'environnement

```bash
cp .env.example .env
# Edite .env et remplace au minimum :
#   JWT_SECRET (openssl rand -hex 64)
#   ADMIN_BOOTSTRAP_PASSWORD
```

### 2. Lancer la stack (dev, hot reload)

```bash
docker compose up -d
docker compose logs -f backend admin
```

Au premier démarrage, un compte admin est créé automatiquement avec les credentials de `.env`. Les logs du backend afficheront `[bootstrap] Admin user created: ...`.

### 3. Accès

| Service       | URL                                | Description                  |
|---------------|------------------------------------|------------------------------|
| Admin panel   | http://localhost:3000              | Interface Next.js            |
| API REST      | http://localhost:3001/api/v1       | Endpoints REST               |
| Swagger docs  | http://localhost:3001/api/docs     | Documentation OpenAPI        |
| MongoDB       | mongodb://localhost:27017/portfolio| Direct DB access             |

### 4. Première connexion

Va sur http://localhost:3000, login avec les credentials de bootstrap (`.env`).
**Change immédiatement le mot de passe** depuis `/users`.

---

## Lancement en production

```bash
# Set production values in .env first!
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Les images runtime sont compilées (NestJS → `dist/`, Next.js → `standalone`), utilisateurs non-root, pas de volume source monté.

---

## API — endpoints publics (consommés par le portfolio)

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/projects`               | Liste tous les projets               |
| GET    | `/projects/slug/:slug`    | Détail projet par slug               |
| GET    | `/skills`                 | Liste des compétences                |
| GET    | `/experiences`            | Liste des expériences                |
| GET    | `/education`              | Liste éducation                      |
| GET    | `/tags`                   | Liste des tags                       |
| POST   | `/contacts`               | Envoi formulaire de contact (rate-limited 5/min) |

## API — endpoints protégés (JWT Bearer requis)

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| POST   | `/auth/login`             | `{ email, password }` → `{ accessToken, user }` |
| GET    | `/auth/me`                | Profil utilisateur connecté          |
| POST   | `/projects`               | Crée un projet                       |
| PATCH  | `/projects/:id`           | Met à jour                           |
| DELETE | `/projects/:id`           | Supprime                             |
| ... (idem pour skills, experiences, education, tags) |
| GET    | `/contacts`               | Boîte de réception (admin)           |
| GET    | `/contacts/unread-count`  | Compteur non-lus                     |
| PATCH  | `/contacts/:id`           | Marquer lu/archivé                   |
| GET    | `/users`                  | Liste utilisateurs (admin only)      |

---

## Connecter le portfolio Vite au backend

Dans `cv-3d/src/components/Sections/SectionContact.jsx`, remplace le mock submit par :

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const handleSubmit = async (e) => {
  e.preventDefault();
  setStatus('sending');
  try {
    const res = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message }),
    });
    if (!res.ok) throw new Error('Failed');
    setStatus('sent');
    setName(''); setEmail(''); setSubject(''); setMessage('');
  } catch {
    setStatus('error');
  }
};
```

Et ajoute dans `cv-3d/.env.local` :
```
VITE_API_URL=http://localhost:3001/api/v1
```

---

## Commandes utiles

```bash
# Voir les logs en direct
docker compose logs -f backend
docker compose logs -f admin

# Shell dans un conteneur
docker compose exec backend sh
docker compose exec mongo mongosh portfolio

# Reset complet (perte de données !)
docker compose down -v

# Rebuild après changement de Dockerfile
docker compose up -d --build backend
```

---

## Stack technique

**Backend**
- NestJS 10 · Mongoose · Passport JWT · class-validator · Swagger · Helmet · Throttler

**Admin**
- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- TanStack Query · React Hook Form + Zod · Zustand · Sonner · Axios

**Thème visuel** : palette identique au portfolio (`#050309` bg, `#d4c19a` goldPale, `#8a6f3f` goldDeep, `#ffd97a` goldGlow), JetBrains Mono pour les éléments console.

---

## Sécurité — checklist production

- [ ] `JWT_SECRET` régénéré avec `openssl rand -hex 64`
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` changé en mot de passe fort
- [ ] HTTPS activé devant le backend (reverse proxy : Nginx, Traefik, Caddy)
- [ ] `CORS_ORIGIN` configuré avec les vrais domaines prod
- [ ] MongoDB protégé par authentification (créer un user dédié, pas root)
- [ ] Rate limiting éventuellement renforcé (cf. `app.module.ts`)
- [ ] Backups MongoDB programmés
