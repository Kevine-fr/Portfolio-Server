import * as yaml from 'js-yaml';
import { SKILL_CATEGORIES, SkillCategory } from '../skills/skill.schema';
import { PROJECT_STATUSES } from '../projects/project.schema';

/**
 * Optional file read in each repository (and in the GitHub profile repository)
 * to control what the portfolio displays. YAML or JSON.
 */
export const CONFIG_FILENAMES = [
  '.portfolio.yml',
  '.portfolio.yaml',
  '.portfolio.json',
  'portfolio.yml',
  'portfolio.yaml',
  'portfolio.json',
];

const MAX_CONFIG_SIZE = 200_000;

// ─── Normalized shapes ─────────────────────────────────────────────────────
export interface ProjectConfig {
  title?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  /** Markdown file used for the detail page instead of the README. */
  content?: string;
  cover?: string;
  gallery?: string[];
  video?: string;
  techStack?: string[];
  liveUrl?: string;
  featured?: boolean;
  order?: number;
  status?: (typeof PROJECT_STATUSES)[number];
  year?: number;
  /** true → the repository is never shown, even if selected or tagged. */
  hidden?: boolean;
}

export interface SkillConfig {
  name: string;
  category?: SkillCategory;
  level?: number;
  icon?: string;
  order?: number;
  visible?: boolean;
}

export interface ExperienceConfig {
  title: string;
  company: string;
  location?: string;
  startDate: Date;
  endDate?: Date | null;
  current: boolean;
  description?: string;
  achievements: string[];
  techStack: string[];
  order?: number;
}

export interface EducationConfig {
  school: string;
  degree: string;
  field?: string;
  location?: string;
  startDate: Date;
  endDate?: Date | null;
  description?: string;
  order?: number;
}

export interface AboutConfig {
  firstName?: string;
  lastName?: string;
  title?: string;
  tagline?: string;
  bio?: string;
  cvUrl?: string;
  cvFilename?: string;
  roles?: string[];
  stats?: Array<{ label: string; value: number; order: number }>;
  timeline?: Array<{ year: string; title: string; description?: string; order: number }>;
  values?: Array<{ icon: string; title: string; description?: string; order: number }>;
}

export interface ProfileConfig {
  about?: AboutConfig;
  skills?: SkillConfig[];
  experiences?: ExperienceConfig[];
  education?: EducationConfig[];
}

// ─── Parsing ───────────────────────────────────────────────────────────────
export function findConfigFile(fileNames: string[]): string | undefined {
  const lower = new Map(fileNames.map((n) => [n.toLowerCase(), n]));
  for (const candidate of CONFIG_FILENAMES) {
    const found = lower.get(candidate);
    if (found) return found;
  }
  return undefined;
}

/** Parses YAML (or JSON, which is valid YAML). Throws a readable error. */
export function parseConfigText(text: string, filename = 'config'): Record<string, unknown> {
  if (text.length > MAX_CONFIG_SIZE) throw new Error(`${filename} : fichier trop volumineux`);
  let data: unknown;
  try {
    data = filename.toLowerCase().endsWith('.json') ? JSON.parse(text) : yaml.load(text);
  } catch (err: any) {
    const reason = String(err?.reason || err?.message || err).split('\n')[0];
    throw new Error(`${filename} : syntaxe invalide (${reason})`);
  }
  if (data === undefined || data === null) return {};
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${filename} : un objet est attendu à la racine`);
  }
  return data as Record<string, unknown>;
}

// ─── Small typed readers (lenient: wrong types are reported and ignored) ──
type Warn = (message: string) => void;

function str(v: unknown, key: string, warn: Warn, max = 5000): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return warn(`« ${key} » doit être un texte`), undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

function bool(v: unknown, key: string, warn: Warn): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 'false') return v === 'true';
  return warn(`« ${key} » doit être true ou false`), undefined;
}

function int(v: unknown, key: string, warn: Warn): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n === 'number' && Number.isFinite(n)) return Math.round(n);
  return warn(`« ${key} » doit être un nombre`), undefined;
}

function strList(v: unknown, key: string, warn: Warn, max = 50): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const list = typeof v === 'string' ? v.split(',') : v;
  if (!Array.isArray(list)) return warn(`« ${key} » doit être une liste`), undefined;
  return list
    .filter((x) => typeof x === 'string' || typeof x === 'number')
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, max);
}

function objList(v: unknown, key: string, warn: Warn): Record<string, unknown>[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) return warn(`« ${key} » doit être une liste`), undefined;
  return v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x));
}

const PRESENT = new Set(['present', 'now', 'current', 'today', "aujourd'hui", 'aujourdhui', 'en cours', 'actuel']);

/**
 * Accepts 2024, "2024", "2024-03", "2024-03-15", ISO strings or YAML dates.
 * Returns `present: true` for "present" / "aujourd'hui"…
 */
export function parseFlexibleDate(v: unknown): { date: Date | null; present: boolean } {
  if (v === undefined || v === null || v === '') return { date: null, present: false };
  if (v instanceof Date) return { date: Number.isNaN(v.getTime()) ? null : v, present: false };
  if (typeof v === 'number' && Number.isInteger(v) && v > 1900 && v < 3000) {
    return { date: new Date(Date.UTC(v, 0, 1)), present: false };
  }
  if (typeof v !== 'string') return { date: null, present: false };
  const s = v.trim();
  if (PRESENT.has(s.toLowerCase())) return { date: null, present: true };
  let m = /^(\d{4})$/.exec(s);
  if (m) return { date: new Date(Date.UTC(+m[1], 0, 1)), present: false };
  m = /^(\d{4})[-/](\d{1,2})$/.exec(s);
  if (m && +m[2] >= 1 && +m[2] <= 12) return { date: new Date(Date.UTC(+m[1], +m[2] - 1, 1)), present: false };
  m = /^(\d{1,2})[-/](\d{4})$/.exec(s);
  if (m && +m[1] >= 1 && +m[1] <= 12) return { date: new Date(Date.UTC(+m[2], +m[1] - 1, 1)), present: false };
  const d = new Date(s);
  return { date: Number.isNaN(d.getTime()) ? null : d, present: false };
}

// ─── Project config ────────────────────────────────────────────────────────
const PROJECT_KEYS = new Set([
  'title', 'slug', 'subtitle', 'description', 'content', 'readme', 'cover', 'coverimage', 'image',
  'gallery', 'screenshots', 'video', 'demovideo', 'techstack', 'tech', 'stack', 'technologies',
  'liveurl', 'demo', 'website', 'url', 'homepage', 'featured', 'order', 'status', 'year', 'hidden',
]);

export function normalizeProjectConfig(raw: Record<string, unknown>, warn: Warn): ProjectConfig {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.toLowerCase().replace(/[_-]/g, '');
    if (PROJECT_KEYS.has(key)) r[key] = v;
    else warn(`clé inconnue ignorée : « ${k} »`);
  }
  const cfg: ProjectConfig = {
    title: str(r.title, 'title', warn, 200),
    slug: str(r.slug, 'slug', warn, 120),
    subtitle: str(r.subtitle, 'subtitle', warn, 300),
    description: str(r.description, 'description', warn, 2000),
    content: str(r.content ?? r.readme, 'content', warn, 500),
    cover: str(r.cover ?? r.coverimage ?? r.image, 'cover', warn, 2000),
    gallery: strList(r.gallery ?? r.screenshots, 'gallery', warn, 30),
    video: str(r.video ?? r.demovideo, 'video', warn, 2000),
    techStack: strList(r.techstack ?? r.tech ?? r.stack ?? r.technologies, 'techStack', warn),
    liveUrl: str(r.liveurl ?? r.demo ?? r.website ?? r.url ?? r.homepage, 'liveUrl', warn, 2000),
    featured: bool(r.featured, 'featured', warn),
    order: int(r.order, 'order', warn),
    year: int(r.year, 'year', warn),
    hidden: bool(r.hidden, 'hidden', warn),
  };
  const status = str(r.status, 'status', warn);
  if (status) {
    const s = status.toLowerCase();
    if ((PROJECT_STATUSES as readonly string[]).includes(s)) cfg.status = s as ProjectConfig['status'];
    else warn(`« status » doit valoir ${PROJECT_STATUSES.join(', ')}`);
  }
  if (cfg.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(cfg.slug)) {
    warn('« slug » : lettres, chiffres et tirets uniquement — ignoré');
    cfg.slug = undefined;
  }
  if (cfg.liveUrl && !/^https?:\/\//i.test(cfg.liveUrl)) {
    warn('« liveUrl » doit commencer par http(s):// — ignoré');
    cfg.liveUrl = undefined;
  }
  return stripUndefined(cfg);
}

// ─── Profile config ────────────────────────────────────────────────────────
export function normalizeProfileConfig(raw: Record<string, unknown>, warn: Warn): ProfileConfig {
  const out: ProfileConfig = {};
  const lowerKeys = new Map(Object.keys(raw).map((k) => [k.toLowerCase(), k]));
  const get = (...names: string[]) => {
    for (const n of names) if (lowerKeys.has(n)) return raw[lowerKeys.get(n)!];
    return undefined;
  };

  const about = get('about', 'profile');
  if (about && typeof about === 'object' && !Array.isArray(about)) {
    out.about = normalizeAbout(about as Record<string, unknown>, warn);
  }

  const skills = objList(get('skills', 'competences'), 'skills', warn);
  if (skills) {
    out.skills = skills
      .map((s, i) => normalizeSkill(s, i, warn))
      .filter((s): s is SkillConfig => !!s);
  }

  const experiences = objList(get('experiences', 'experience'), 'experiences', warn);
  if (experiences) {
    out.experiences = experiences
      .map((e, i) => normalizeExperience(e, i, warn))
      .filter((e): e is ExperienceConfig => !!e);
  }

  const education = objList(get('education', 'formations', 'formation'), 'education', warn);
  if (education) {
    out.education = education
      .map((e, i) => normalizeEducation(e, i, warn))
      .filter((e): e is EducationConfig => !!e);
  }
  return out;
}

function normalizeAbout(a: Record<string, unknown>, warn: Warn): AboutConfig {
  const w: Warn = (m) => warn(`about : ${m}`);
  const cfg: AboutConfig = {
    firstName: str(a.firstName, 'firstName', w, 100),
    lastName: str(a.lastName, 'lastName', w, 100),
    title: str(a.title, 'title', w, 200),
    tagline: str(a.tagline, 'tagline', w, 500),
    bio: str(a.bio, 'bio', w, 10_000),
    cvUrl: str(a.cvUrl ?? a.cv, 'cvUrl', w, 2000),
    cvFilename: str(a.cvFilename, 'cvFilename', w, 200),
    roles: strList(a.roles, 'roles', w, 20),
  };
  const stats = objList(a.stats, 'stats', w);
  if (stats) {
    cfg.stats = stats
      .map((s, i) => ({ label: str(s.label, 'stats.label', w, 60), value: int(s.value, 'stats.value', w) ?? 0, order: i }))
      .filter((s) => !!s.label) as AboutConfig['stats'];
  }
  const timeline = objList(a.timeline, 'timeline', w);
  if (timeline) {
    cfg.timeline = timeline
      .map((t, i) => ({
        year: str(t.year, 'timeline.year', w, 20),
        title: str(t.title, 'timeline.title', w, 200),
        description: str(t.description, 'timeline.description', w, 1000),
        order: i,
      }))
      .filter((t) => !!t.year && !!t.title) as AboutConfig['timeline'];
  }
  const values = objList(a.values, 'values', w);
  if (values) {
    cfg.values = values
      .map((v, i) => ({
        icon: str(v.icon, 'values.icon', w, 8) ?? '◆',
        title: str(v.title, 'values.title', w, 100),
        description: str(v.description, 'values.description', w, 1000),
        order: i,
      }))
      .filter((v) => !!v.title) as AboutConfig['values'];
  }
  return stripUndefined(cfg);
}

function normalizeSkill(s: Record<string, unknown>, index: number, warn: Warn): SkillConfig | null {
  const w: Warn = (m) => warn(`skills[${index}] : ${m}`);
  const name = str(s.name, 'name', w, 80);
  if (!name) return w('« name » manquant — ignorée'), null;
  const category = str(s.category, 'category', w)?.toLowerCase();
  const level = int(s.level, 'level', w);
  const cfg: SkillConfig = {
    name,
    category: category && (SKILL_CATEGORIES as readonly string[]).includes(category) ? (category as SkillCategory) : undefined,
    level: level === undefined ? undefined : Math.max(0, Math.min(100, level)),
    icon: str(s.icon, 'icon', w, 2000),
    order: int(s.order, 'order', w),
    visible: bool(s.visible, 'visible', w),
  };
  if (category && !cfg.category) w(`catégorie inconnue « ${category} » (${SKILL_CATEGORIES.join(', ')})`);
  return stripUndefined(cfg);
}

function normalizeExperience(e: Record<string, unknown>, index: number, warn: Warn): ExperienceConfig | null {
  const w: Warn = (m) => warn(`experiences[${index}] : ${m}`);
  const title = str(e.title ?? e.role ?? e.position, 'title', w, 200);
  const company = str(e.company ?? e.organization, 'company', w, 200);
  const start = parseFlexibleDate(e.startDate ?? e.start ?? e.from);
  const end = parseFlexibleDate(e.endDate ?? e.end ?? e.to);
  if (!title || !company || !start.date) {
    w('« title », « company » et « startDate » sont requis — ignorée');
    return null;
  }
  const current = bool(e.current, 'current', w) ?? end.present;
  return stripUndefined({
    title,
    company,
    location: str(e.location, 'location', w, 200),
    startDate: start.date,
    endDate: current ? null : end.date,
    current,
    description: str(e.description, 'description', w, 5000),
    achievements: strList(e.achievements ?? e.highlights, 'achievements', w) ?? [],
    techStack: strList(e.techStack ?? e.tech ?? e.stack, 'techStack', w) ?? [],
    order: int(e.order, 'order', w) ?? index,
  });
}

function normalizeEducation(e: Record<string, unknown>, index: number, warn: Warn): EducationConfig | null {
  const w: Warn = (m) => warn(`education[${index}] : ${m}`);
  const school = str(e.school ?? e.institution, 'school', w, 200);
  const degree = str(e.degree ?? e.diploma ?? e.title, 'degree', w, 200);
  const start = parseFlexibleDate(e.startDate ?? e.start ?? e.from);
  const end = parseFlexibleDate(e.endDate ?? e.end ?? e.to);
  if (!school || !degree || !start.date) {
    w('« school », « degree » et « startDate » sont requis — ignorée');
    return null;
  }
  return stripUndefined({
    school,
    degree,
    field: str(e.field, 'field', w, 200),
    location: str(e.location, 'location', w, 200),
    startDate: start.date,
    endDate: end.present ? null : end.date,
    description: str(e.description, 'description', w, 5000),
    order: int(e.order, 'order', w) ?? index,
  });
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
