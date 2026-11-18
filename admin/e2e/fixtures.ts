// Données volontairement longues : noms de dépôts, e-mails, compétences et
// messages qui débordaient sur un écran de 320 px.
const report = {
  trigger: 'schedule', username: 'Kevine-fr', startedAt: '', ok: false, reposScanned: 12, reposIncluded: 4, durationMs: 3200,
  rateLimit: { limit: 60, remaining: 3, reset: null },
  projects: { created: ['A'], updated: ['B'], removed: [], detached: [], skipped: [{ repo: 'secret-repo-with-a-very-long-name', reason: 'masqué (hidden: true)' }] },
  skills: { created: 3, updated: 1, removed: 0 }, experiences: { created: 0, updated: 0, removed: 0 },
  education: { created: 0, updated: 0, removed: 0 }, about: true,
  warnings: ['portfolio-server/.portfolio.yml : clé inconnue ignorée : « une_cle_tres_longue_qui_ne_devrait_pas_casser_la_mise_en_page »'],
  errors: ["Limite d'appels à l'API GitHub atteinte (réinitialisation 16:02:11). Ajoutez GITHUB_TOKEN pour passer à 5000 requêtes/heure."],
};

const settings = {
  username: 'Kevine-fr', effectiveUsername: 'Kevine-fr', topic: 'portfolio', selectedRepos: [], excludedRepos: [],
  includeForks: false, syncProjects: true, syncSkills: true, syncProfile: true, profileRepo: '', minLanguagePercent: 2,
  autoSync: true, syncIntervalMinutes: 60, tokenConfigured: false, lastSyncAt: '2025-05-01T10:00:00Z', lastSyncReport: report,
};

const repos = {
  username: 'Kevine-fr', topic: 'portfolio', tokenConfigured: false, rateLimit: null,
  repos: [
    {
      id: 1, name: 'un-nom-de-depot-vraiment-tres-long-pour-tester-le-responsive', fullName: 'k/x',
      description: 'Une description assez longue pour voir comment elle passe à la ligne sur un petit écran de téléphone.',
      htmlUrl: 'https://github.com/x', homepage: null, language: 'TypeScript', stars: 12, forks: 1,
      topics: ['portfolio', 'nestjs', 'mongodb', 'docker', 'typescript', 'prometheus'], fork: true, archived: true,
      pushedAt: '2025-05-01T10:00:00Z', isProfileRepo: false, inclusion: 'topic', selected: false, excluded: false,
      project: { id: 'p1', slug: 'x', title: 'Portfolio Server Avec Long Titre', status: 'published', autoSync: true },
    },
    {
      id: 2, name: 'side', fullName: 'k/side', description: null, htmlUrl: 'https://github.com/y', homepage: null, language: null,
      stars: 0, forks: 0, topics: [], fork: false, archived: false, pushedAt: null, isProfileRepo: false,
      inclusion: null, selected: false, excluded: false, project: null,
    },
  ],
};

const project = {
  _id: 'p1', slug: 'un-identifiant-de-projet-assez-long', title: 'Portfolio 3D Immersif Avec Un Titre Long', subtitle: 'Site perso',
  status: 'published', featured: true, year: 2025, order: 0, techStack: ['React'], gallery: [], source: 'github',
  github: { fullName: 'Kevine-fr/un-nom-de-depot-vraiment-tres-long', htmlUrl: 'https://github.com/x', stars: 3, autoSync: true },
};

export const user = { id: '1', email: 'admin@kevinefray.dev', name: 'Admin', role: 'admin' };

/** Réponse simulée de l'API pour un chemin donné. */
export function apiResponse(url: string): unknown {
  const path = new URL(url).pathname.replace(/^.*\/api\/v1/, '');
  switch (path) {
    case '/auth/me': return user;
    case '/contacts/unread-count': return { count: 3 };
    case '/projects': return [project, { ...project, _id: 'p2', source: 'manual', github: undefined, title: 'Autre' }];
    case '/github/settings': return settings;
    case '/github/status': return { running: false, username: 'Kevine-fr', tokenConfigured: false, lastSyncAt: settings.lastSyncAt, lastSyncReport: report, rateLimit: report.rateLimit };
    case '/github/repos': return repos;
    case '/skills': return [
      { _id: 's1', name: 'TypeScript', category: 'frontend', level: 95, visible: true, order: 0, source: 'github' },
      { _id: 's2', name: 'Un nom de compétence particulièrement long', category: 'backend', level: 60, visible: false, order: 1 },
    ];
    case '/experiences': return [{
      _id: 'e1', title: 'Développeur Full-Stack Senior Freelance', company: 'Une entreprise au nom assez long SAS', location: 'Paris',
      startDate: '2024-01-01', current: true, description: 'x', achievements: ['a'], techStack: ['React', 'NestJS', 'Docker'], order: 0, source: 'github',
    }];
    case '/education': return [{ _id: 'd1', school: 'École Supérieure d’Informatique', degree: 'Master', field: 'Architecture logicielle et cloud', startDate: '2023-09-01', endDate: '2025-06-30', order: 0 }];
    case '/contacts': return [{
      _id: 'c1', name: 'Jean-Baptiste Dupont-Lefebvre', email: 'jean-baptiste.dupont-lefebvre@une-entreprise-tres-longue.example.com',
      subject: 'Proposition de collaboration', message: 'Bonjour, '.repeat(30), read: false, archived: false, createdAt: '2025-05-01T10:00:00Z',
    }];
    case '/users': return [user && { _id: '1', ...user, isActive: true }, { _id: '2', email: 'editeur.avec.une.adresse.longue@example.com', name: 'Éditeur', role: 'editor', isActive: false }];
    case '/tags': return [{ _id: 't1', name: 'WebGL', slug: 'webgl', color: '#6366f1' }, { _id: 't2', name: 'Une étiquette longue', slug: 'une-etiquette-longue', color: '#22c55e' }];
    case '/about': return {
      firstName: 'Kevine', lastName: 'DIANTOUADI', roles: ['Dev'], tagline: 'Hello', stats: [{ label: 'ANS XP', value: 3 }], title: 'Qui suis-je ?',
      bio: 'Bio', timeline: [{ year: '2021', title: 'Start', description: 'x' }], values: [{ icon: '◆', title: 'Rigueur', description: 'y' }],
    };
    default: return [];
  }
}
