import type { GithubRepoSummary, GithubSyncReport, RateLimit } from '@/types';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/** One-line French summary of a sync report, e.g. "2 projets ajoutés · 1 mis à jour". */
export function summarizeReport(report: GithubSyncReport): string {
  const p = report.projects;
  const parts: string[] = [];
  if (p.created.length) parts.push(`${plural(p.created.length, 'projet ajouté', 'projets ajoutés')}`);
  if (p.updated.length) parts.push(`${plural(p.updated.length, 'projet mis à jour', 'projets mis à jour')}`);
  if (p.removed.length) parts.push(`${plural(p.removed.length, 'projet retiré', 'projets retirés')}`);
  if (p.detached.length) parts.push(`${plural(p.detached.length, 'projet détaché', 'projets détachés')}`);
  const skills = report.skills.created + report.skills.updated + report.skills.removed;
  if (skills) parts.push(`${plural(skills, 'compétence modifiée', 'compétences modifiées')}`);
  const exp = report.experiences.created + report.experiences.updated + report.experiences.removed;
  if (exp) parts.push(`${plural(exp, 'expérience modifiée', 'expériences modifiées')}`);
  const edu = report.education.created + report.education.updated + report.education.removed;
  if (edu) parts.push(`${plural(edu, 'formation modifiée', 'formations modifiées')}`);
  if (report.about) parts.push('« À propos » mis à jour');
  return parts.length ? parts.join(' · ') : 'Aucun changement';
}

export function inclusionLabel(repo: Pick<GithubRepoSummary, 'inclusion' | 'isProfileRepo'>, topic?: string): string {
  if (repo.inclusion === 'selected') return 'Sélectionné';
  if (repo.inclusion === 'topic') return topic ? `Topic « ${topic} »` : 'Topic';
  if (repo.isProfileRepo) return 'Dépôt de profil';
  return 'Non affiché';
}

export type RepoFilter = 'all' | 'shown' | 'hidden';

export function filterRepos(repos: GithubRepoSummary[], query: string, filter: RepoFilter): GithubRepoSummary[] {
  const q = query.trim().toLowerCase();
  return repos.filter((r) => {
    if (filter === 'shown' && r.inclusion === null) return false;
    if (filter === 'hidden' && r.inclusion !== null) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q) ||
      r.topics.some((t) => t.toLowerCase().includes(q)) ||
      (r.language ?? '').toLowerCase().includes(q)
    );
  });
}

export function rateLimitLabel(rate: RateLimit | null | undefined): string | null {
  if (!rate) return null;
  return `${rate.remaining}/${rate.limit} requêtes restantes`;
}

export const SYNC_INTERVALS: Array<{ value: number; label: string }> = [
  { value: 15, label: 'Toutes les 15 min' },
  { value: 30, label: 'Toutes les 30 min' },
  { value: 60, label: 'Toutes les heures' },
  { value: 180, label: 'Toutes les 3 h' },
  { value: 360, label: 'Toutes les 6 h' },
  { value: 720, label: 'Toutes les 12 h' },
  { value: 1440, label: 'Une fois par jour' },
];

export const PROJECT_YAML_EXAMPLE = `# .portfolio.yml — à la racine du dépôt (tous les champs sont facultatifs)
title: Portfolio 3D
subtitle: Site personnel immersif
description: Voyage cosmique en Three.js entre les sections du CV.
content: docs/PORTFOLIO.md   # page détaillée (README.md par défaut)
cover: docs/cover.png        # chemin dans le dépôt ou URL
gallery:
  - docs/screen-1.png
  - docs/screen-2.png
video: https://example.com/demo.mp4
techStack: [React, Three.js, Vite]
liveUrl: https://kevinefray.dev
featured: true
order: 1
status: published            # published | draft | archived
year: 2025
hidden: false                # true = ne jamais afficher ce dépôt`;

export const PROFILE_YAML_EXAMPLE = `# .portfolio.yml — dans le dépôt de profil <identifiant>/<identifiant>
about:
  firstName: Kevine
  lastName: DIANTOUADI
  tagline: Expériences web immersives…
  roles: [Développeur Full-Stack, Creative Developer]
  bio: Passionné par le **design** et la **3D**.
  cv: docs/cv.pdf
skills:
  - { name: React, category: frontend, level: 90 }
  - { name: Figma, category: design, level: 70 }
experiences:
  - title: Développeur Full-Stack
    company: Freelance
    location: France
    startDate: 2024-01
    endDate: present
    description: Applications web sur mesure.
    achievements: [Refonte d'un SaaS, Mise en place CI/CD]
    techStack: [React, NestJS, Docker]
education:
  - school: École Supérieure
    degree: Master
    field: Architecture logicielle
    startDate: 2023-09
    endDate: 2025-06`;
