import type { SkillCategory } from '../skills/skill.schema';

export interface TechInfo {
  name: string;
  category: SkillCategory;
}

/**
 * Known technologies, indexed by a normalized key (lowercase, no spaces/dots/dashes).
 * Used to turn GitHub languages and repository topics into readable tech names
 * ("nestjs" → "NestJS") and to guess the skill category.
 */
const CATALOG: Array<[string[], string, SkillCategory]> = [
  // ── Languages / frontend ───────────────────────────────────────────────
  [['javascript', 'js'], 'JavaScript', 'frontend'],
  [['typescript', 'ts'], 'TypeScript', 'frontend'],
  [['html', 'html5'], 'HTML', 'frontend'],
  [['css', 'css3'], 'CSS', 'frontend'],
  [['scss', 'sass'], 'Sass', 'frontend'],
  [['less'], 'Less', 'frontend'],
  [['vue', 'vuejs'], 'Vue.js', 'frontend'],
  [['nuxt', 'nuxtjs'], 'Nuxt', 'frontend'],
  [['react', 'reactjs'], 'React', 'frontend'],
  [['reactnative'], 'React Native', 'frontend'],
  [['next', 'nextjs'], 'Next.js', 'frontend'],
  [['angular', 'angularjs'], 'Angular', 'frontend'],
  [['svelte', 'sveltekit'], 'Svelte', 'frontend'],
  [['astro'], 'Astro', 'frontend'],
  [['threejs', 'three'], 'Three.js', 'frontend'],
  [['webgl'], 'WebGL', 'frontend'],
  [['glsl'], 'GLSL', 'frontend'],
  [['tailwind', 'tailwindcss'], 'Tailwind CSS', 'frontend'],
  [['bootstrap'], 'Bootstrap', 'frontend'],
  [['redux'], 'Redux', 'frontend'],
  [['vite', 'vitejs'], 'Vite', 'frontend'],
  [['framermotion'], 'Framer Motion', 'frontend'],
  [['pwa'], 'PWA', 'frontend'],
  [['flutter'], 'Flutter', 'frontend'],
  [['dart'], 'Dart', 'frontend'],
  // ── Backend ────────────────────────────────────────────────────────────
  [['node', 'nodejs'], 'Node.js', 'backend'],
  [['nestjs', 'nest'], 'NestJS', 'backend'],
  [['express', 'expressjs'], 'Express', 'backend'],
  [['python'], 'Python', 'backend'],
  [['django'], 'Django', 'backend'],
  [['flask'], 'Flask', 'backend'],
  [['fastapi'], 'FastAPI', 'backend'],
  [['java'], 'Java', 'backend'],
  [['spring', 'springboot'], 'Spring Boot', 'backend'],
  [['kotlin'], 'Kotlin', 'backend'],
  [['php'], 'PHP', 'backend'],
  [['laravel'], 'Laravel', 'backend'],
  [['symfony'], 'Symfony', 'backend'],
  [['ruby'], 'Ruby', 'backend'],
  [['rails', 'rubyonrails'], 'Ruby on Rails', 'backend'],
  [['go', 'golang'], 'Go', 'backend'],
  [['rust'], 'Rust', 'backend'],
  [['c'], 'C', 'backend'],
  [['cpp', 'c++'], 'C++', 'backend'],
  [['csharp', 'c#'], 'C#', 'backend'],
  [['dotnet', 'aspnet', 'aspnetcore'], '.NET', 'backend'],
  [['swift'], 'Swift', 'backend'],
  [['scala'], 'Scala', 'backend'],
  [['elixir'], 'Elixir', 'backend'],
  [['graphql'], 'GraphQL', 'backend'],
  [['restapi', 'rest'], 'REST API', 'backend'],
  [['mongodb', 'mongo'], 'MongoDB', 'backend'],
  [['mongoose'], 'Mongoose', 'backend'],
  [['postgresql', 'postgres'], 'PostgreSQL', 'backend'],
  [['mysql'], 'MySQL', 'backend'],
  [['sqlite'], 'SQLite', 'backend'],
  [['redis'], 'Redis', 'backend'],
  [['prisma'], 'Prisma', 'backend'],
  [['firebase'], 'Firebase', 'backend'],
  [['supabase'], 'Supabase', 'backend'],
  [['socketio', 'websocket', 'websockets'], 'WebSocket', 'backend'],
  [['sql', 'tsql', 'plpgsql'], 'SQL', 'backend'],
  // ── Tools / DevOps ─────────────────────────────────────────────────────
  [['docker', 'dockerfile', 'dockercompose'], 'Docker', 'tools'],
  [['kubernetes', 'k8s'], 'Kubernetes', 'tools'],
  [['terraform', 'hcl'], 'Terraform', 'tools'],
  [['ansible'], 'Ansible', 'tools'],
  [['githubactions', 'cicd', 'ci'], 'CI/CD', 'tools'],
  [['git'], 'Git', 'tools'],
  [['aws', 'amazonwebservices'], 'AWS', 'tools'],
  [['gcp', 'googlecloud'], 'Google Cloud', 'tools'],
  [['azure'], 'Azure', 'tools'],
  [['nginx'], 'Nginx', 'tools'],
  [['traefik'], 'Traefik', 'tools'],
  [['linux'], 'Linux', 'tools'],
  [['shell', 'bash', 'zsh'], 'Shell', 'tools'],
  [['powershell'], 'PowerShell', 'tools'],
  [['prometheus'], 'Prometheus', 'tools'],
  [['grafana'], 'Grafana', 'tools'],
  [['jest'], 'Jest', 'tools'],
  [['vitest'], 'Vitest', 'tools'],
  [['playwright'], 'Playwright', 'tools'],
  [['cypress'], 'Cypress', 'tools'],
  [['webpack'], 'Webpack', 'tools'],
  // ── Design ─────────────────────────────────────────────────────────────
  [['figma'], 'Figma', 'design'],
  [['blender'], 'Blender', 'design'],
  [['uidesign', 'ui', 'ux', 'uxdesign'], 'UI/UX', 'design'],
  // ── Other ──────────────────────────────────────────────────────────────
  [['jupyternotebook', 'jupyter'], 'Jupyter', 'other'],
  [['machinelearning', 'ml'], 'Machine Learning', 'other'],
  [['ai', 'artificialintelligence'], 'IA', 'other'],
];

const INDEX = new Map<string, TechInfo>();
for (const [keys, name, category] of CATALOG) {
  for (const key of [...keys, name]) INDEX.set(normalizeTechKey(key), { name, category });
}

/** GitHub linguist entries that are not meaningful skills. */
const IGNORED_LANGUAGES = new Set(
  ['procfile', 'batchfile', 'makefile', 'cmake', 'roff', 'nix', 'smarty', 'mustache', 'handlebars', 'ejs', 'twig']
    .map(normalizeTechKey),
);

export function normalizeTechKey(value: string): string {
  return String(value).toLowerCase().replace(/[\s._-]+/g, '');
}

/** Info for a known technology (topic slug, language or free text), else null. */
export function lookupTech(value: string): TechInfo | null {
  if (!value) return null;
  return INDEX.get(normalizeTechKey(value)) ?? null;
}

/** GitHub language → display name + category (unknown languages are kept as-is). */
export function languageInfo(language: string): TechInfo | null {
  if (!language || IGNORED_LANGUAGES.has(normalizeTechKey(language))) return null;
  return lookupTech(language) ?? { name: language, category: 'other' };
}

/** Guess a category for a free-text skill name. */
export function guessCategory(name: string): SkillCategory {
  return lookupTech(name)?.category ?? 'other';
}

/** Removes case-insensitive duplicates while keeping the first spelling. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
