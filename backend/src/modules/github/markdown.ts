import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { posix } from 'path';

/** Location of a markdown file inside a GitHub repository. */
export interface RepoContext {
  owner: string;
  repo: string;
  branch: string;
  /** Path of the markdown file (e.g. "docs/README.md"): relative links are resolved from it. */
  filePath?: string;
}

export interface RenderOptions {
  repo?: RepoContext;
  /** Removes a leading "# Title" (the portfolio already displays the project title). */
  stripLeadingH1?: boolean;
}

export interface RenderResult {
  html: string;
  /** Absolute URLs of the images found, in document order. */
  images: string[];
}

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

type Token = ReturnType<MarkdownIt['parse']>[number];

const SCHEME_OR_ANCHOR = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const GITHUB_BLOB = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i;
const BADGE =
  /(shields\.io|badgen\.net|badge\.fury\.io|travis-ci\.|circleci\.com|codecov\.io|coveralls\.io|snyk\.io|sonarcloud\.io|codeclimate\.com|deepscan\.io|app\.netlify\.com\/sites\/[^/]+\/deploys|vercel\.com\/button|\/badges?\/|badge\.svg|\/workflows\/[^?#]+\/badge)/i;

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function encodePath(path: string): string {
  return path.split('/').map((s) => encodeURIComponent(safeDecode(s))).join('/');
}

/**
 * Resolves a link found in a repository markdown file.
 * - absolute URLs, mailto:, anchors are returned unchanged
 * - relative paths become raw.githubusercontent.com URLs (images) or
 *   github.com/…/blob/… URLs (links), relative to the markdown file folder
 */
export function resolveRepoUrl(url: string, ctx: RepoContext | undefined, kind: 'raw' | 'blob'): string {
  const value = String(url ?? '').trim();
  if (!value || SCHEME_OR_ANCHOR.test(value) || !ctx) return value;

  const cut = value.search(/[?#]/);
  const pathPart = cut === -1 ? value : value.slice(0, cut);
  const suffix = cut === -1 ? '' : value.slice(cut);
  if (!pathPart) return value;

  const baseDir = ctx.filePath ? posix.dirname(ctx.filePath) : '.';
  const joined = pathPart.startsWith('/') ? pathPart.slice(1) : posix.join(baseDir, pathPart);
  let normalized = posix.normalize(joined).replace(/^(\.\.\/)+/, '');
  if (normalized === '.' || normalized === '..') normalized = '';

  const owner = encodeURIComponent(ctx.owner);
  const repo = encodeURIComponent(ctx.repo);
  const branch = encodePath(ctx.branch || 'HEAD');
  const path = encodePath(normalized);
  return kind === 'raw'
    ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}${suffix}`
    : `https://github.com/${owner}/${repo}/${normalized ? `blob/${branch}/${path}` : ''}${suffix}`;
}

/** Image URL usable in an <img>: relative → raw, github.com/…/blob/… → raw. */
export function resolveImageUrl(url: string, ctx?: RepoContext): string {
  const resolved = resolveRepoUrl(url, ctx, 'raw');
  const blob = GITHUB_BLOB.exec(resolved);
  if (blob) {
    const rest = blob[3].replace(/\?raw=true$/i, '');
    return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${rest}`;
  }
  return resolved;
}

export function isBadgeUrl(url: string): boolean {
  return BADGE.test(url);
}

function buildSanitizeOptions(ctx: RepoContext | undefined, images: string[]): sanitizeHtml.IOptions {
  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  return {
    allowedTags: [
      ...headings, 'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
      'em', 'strong', 'b', 'i', 'u', 's', 'del', 'ins', 'mark', 'sup', 'sub', 'small', 'abbr',
      'a', 'img', 'picture', 'source', 'figure', 'figcaption',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'details', 'summary', 'div', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'align', 'loading'],
      source: ['srcset', 'media', 'type'],
      th: ['align', 'colspan', 'rowspan'],
      td: ['align', 'colspan', 'rowspan'],
      p: ['align'],
      div: ['align'],
      details: ['open'],
      ol: ['start'],
      abbr: ['title'],
      code: ['class'],
      ...Object.fromEntries(headings.map((h) => [h, ['align']])),
    },
    allowedClasses: { code: ['language-*'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'], source: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = resolveRepoUrl(attribs.href ?? '', ctx, 'blob');
        const external = /^https?:/i.test(href);
        return {
          tagName,
          attribs: {
            ...attribs,
            href,
            ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const src = resolveImageUrl(attribs.src ?? '', ctx);
        if (src) images.push(src);
        return { tagName, attribs: { ...attribs, src, loading: 'lazy' } };
      },
      source: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          srcset: (attribs.srcset ?? '')
            .split(',')
            .map((part) => {
              const [u, ...descriptor] = part.trim().split(/\s+/);
              return [resolveImageUrl(u, ctx), ...descriptor].join(' ');
            })
            .join(', '),
        },
      }),
    },
  };
}

function withoutLeadingH1(tokens: Token[]): Token[] {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'paragraph_open' || (t.type === 'heading_open' && t.tag !== 'h1')) return tokens;
    if (t.type === 'heading_open' && t.tag === 'h1') {
      const end = tokens.findIndex((x, j) => j > i && x.type === 'heading_close');
      return end === -1 ? tokens : [...tokens.slice(0, i), ...tokens.slice(end + 1)];
    }
  }
  return tokens;
}

/** Markdown → sanitized HTML (+ list of images), safe to inject in the portfolio. */
export function renderMarkdownWithMeta(source: string, options: RenderOptions = {}): RenderResult {
  const env = {};
  let tokens = md.parse(String(source ?? ''), env);
  if (options.stripLeadingH1) tokens = withoutLeadingH1(tokens);
  const rawHtml = md.renderer.render(tokens, md.options, env);
  const images: string[] = [];
  const html = sanitizeHtml(rawHtml, buildSanitizeOptions(options.repo, images)).trim();
  return { html, images };
}

export function renderMarkdown(source: string, options: RenderOptions = {}): string {
  return renderMarkdownWithMeta(source, options).html;
}

/** First image that is not a CI/coverage badge — a good cover candidate. */
export function pickCoverImage(images: string[]): string | undefined {
  return images.find((src) => /^https?:/i.test(src) && !isBadgeUrl(src));
}

function inlineText(token: Token | undefined): string {
  if (!token?.children) return token?.content ?? '';
  let out = '';
  for (const child of token.children) {
    if (child.type === 'text' || child.type === 'code_inline') out += child.content;
    else if (child.type === 'softbreak' || child.type === 'hardbreak') out += ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Text of the first "# Heading" of the document, if any. */
export function extractTitle(source: string): string | undefined {
  const tokens = md.parse(String(source ?? ''), {});
  const i = tokens.findIndex((t) => t.type === 'heading_open' && t.tag === 'h1');
  if (i === -1) return undefined;
  const text = inlineText(tokens[i + 1]);
  return text && text.length <= 100 ? text : undefined;
}

/** First meaningful paragraph as plain text (badges / image-only paragraphs skipped). */
export function extractSummary(source: string, maxLength = 280): string | undefined {
  const tokens = md.parse(String(source ?? ''), {});
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'paragraph_open') continue;
    const text = inlineText(tokens[i + 1]);
    if (text.length < 15) continue;
    if (text.length <= maxLength) return text;
    const cut = text.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
  }
  return undefined;
}
