import {
  extractSummary, extractTitle, isBadgeUrl, pickCoverImage, renderMarkdown, renderMarkdownWithMeta,
  resolveImageUrl, resolveRepoUrl, RepoContext,
} from './markdown';

const ctx: RepoContext = { owner: 'kev', repo: 'my-app', branch: 'main', filePath: 'README.md' };
const docsCtx: RepoContext = { ...ctx, filePath: 'docs/guide/INDEX.md' };

describe('resolveRepoUrl', () => {
  it('keeps absolute URLs, anchors and mailto links untouched', () => {
    expect(resolveRepoUrl('https://x.dev/a.png', ctx, 'raw')).toBe('https://x.dev/a.png');
    expect(resolveRepoUrl('#install', ctx, 'blob')).toBe('#install');
    expect(resolveRepoUrl('mailto:a@b.c', ctx, 'blob')).toBe('mailto:a@b.c');
    expect(resolveRepoUrl('//cdn.dev/x.js', ctx, 'raw')).toBe('//cdn.dev/x.js');
  });

  it('resolves relative paths against the markdown file folder', () => {
    expect(resolveRepoUrl('img/a.png', ctx, 'raw')).toBe('https://raw.githubusercontent.com/kev/my-app/main/img/a.png');
    expect(resolveRepoUrl('./shot.png', docsCtx, 'raw')).toBe(
      'https://raw.githubusercontent.com/kev/my-app/main/docs/guide/shot.png',
    );
    expect(resolveRepoUrl('../../LICENSE', docsCtx, 'blob')).toBe('https://github.com/kev/my-app/blob/main/LICENSE');
  });

  it('treats a leading slash as the repository root and never escapes it', () => {
    expect(resolveRepoUrl('/assets/x.png', docsCtx, 'raw')).toBe('https://raw.githubusercontent.com/kev/my-app/main/assets/x.png');
    expect(resolveRepoUrl('../../../../etc/passwd', ctx, 'raw')).toBe(
      'https://raw.githubusercontent.com/kev/my-app/main/etc/passwd',
    );
  });

  it('keeps query strings / hashes and encodes path segments', () => {
    expect(resolveRepoUrl('docs/My File.md#usage', ctx, 'blob')).toBe(
      'https://github.com/kev/my-app/blob/main/docs/My%20File.md#usage',
    );
    expect(resolveRepoUrl('a%20b.png?raw=1', ctx, 'raw')).toBe('https://raw.githubusercontent.com/kev/my-app/main/a%20b.png?raw=1');
  });

  it('returns the value as-is without repository context', () => {
    expect(resolveRepoUrl('img/a.png', undefined, 'raw')).toBe('img/a.png');
  });
});

describe('resolveImageUrl', () => {
  it('converts github.com blob links to raw URLs', () => {
    expect(resolveImageUrl('https://github.com/kev/other/blob/dev/pic.png?raw=true')).toBe(
      'https://raw.githubusercontent.com/kev/other/dev/pic.png',
    );
  });
});

describe('renderMarkdown', () => {
  it('renders GitHub flavoured markdown', () => {
    const html = renderMarkdown('# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n~~old~~ **bold**');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<table>');
    expect(html).toContain('<s>old</s>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('removes scripts, event handlers and javascript: URLs (XSS)', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n\n<img src="x.png" onerror="alert(1)">\n\n[x](javascript:alert(1)) <a href="JaVaScRiPt:alert(1)">y</a>\n\n<iframe src="https://evil"></iframe><style>body{}</style>',
      { repo: ctx },
    );
    expect(html).not.toMatch(/<script|onerror|href="javascript:|<iframe|<style/i);
    expect(html).toContain('<a>y</a>'); // dangerous href dropped, text kept
  });

  it('rewrites relative links/images and opens external links in a new tab', () => {
    const { html, images } = renderMarkdownWithMeta('![s](docs/s.png)\n\n[guide](docs/guide.md) [site](https://site.dev)', {
      repo: ctx,
    });
    expect(images).toEqual(['https://raw.githubusercontent.com/kev/my-app/main/docs/s.png']);
    expect(html).toContain('href="https://github.com/kev/my-app/blob/main/docs/guide.md"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('loading="lazy"');
  });

  it('rewrites raw HTML images and <picture> sources', () => {
    const { html } = renderMarkdownWithMeta(
      '<p align="center"><picture><source srcset="dark.png 2x, light.png" media="(prefers-color-scheme: dark)"><img src="logo.png" width="120"></picture></p>',
      { repo: ctx },
    );
    expect(html).toContain('align="center"');
    expect(html).toContain('srcset="https://raw.githubusercontent.com/kev/my-app/main/dark.png 2x, https://raw.githubusercontent.com/kev/my-app/main/light.png"');
    expect(html).toContain('width="120"');
  });

  it('keeps code block language classes only', () => {
    const html = renderMarkdown('```ts\nconst a = 1;\n```\n\n<code class="evil language-js">x</code>');
    expect(html).toContain('class="language-ts"');
    expect(html).not.toContain('evil');
  });

  it('can strip the leading H1 (title shown elsewhere)', () => {
    const src = '<p align="center"><img src="logo.png"></p>\n\n# My App\n\nIntro text here.\n\n# Second';
    const html = renderMarkdown(src, { stripLeadingH1: true });
    expect(html).not.toContain('My App');
    expect(html).toContain('<h1>Second</h1>');
    // An H1 after the first paragraph is kept
    expect(renderMarkdown('Intro\n\n# Later', { stripLeadingH1: true })).toContain('<h1>Later</h1>');
  });
});

describe('cover / title / summary extraction', () => {
  it('detects common badges', () => {
    expect(isBadgeUrl('https://img.shields.io/badge/x-y-green')).toBe(true);
    expect(isBadgeUrl('https://github.com/o/r/actions/workflows/ci.yml/badge.svg')).toBe(true);
    expect(isBadgeUrl('https://raw.githubusercontent.com/o/r/main/screenshot.png')).toBe(false);
  });

  it('picks the first non-badge image', () => {
    expect(pickCoverImage(['https://img.shields.io/a', 'https://raw.githubusercontent.com/o/r/main/s.png'])).toBe(
      'https://raw.githubusercontent.com/o/r/main/s.png',
    );
    expect(pickCoverImage(['https://img.shields.io/a'])).toBeUndefined();
    expect(pickCoverImage(['relative.png'])).toBeUndefined();
  });

  it('extracts the first H1 as plain text', () => {
    expect(extractTitle('[![b](x)](y)\n\n# My `cool` App\n\ntext')).toBe('My cool App');
    expect(extractTitle('## Not h1')).toBeUndefined();
  });

  it('extracts the first meaningful paragraph, skipping badges', () => {
    const src = '# T\n\n[![CI](https://img.shields.io/x)](y) [![C](z)](w)\n\nA **3D** portfolio built with React\nand Three.js.\n\nMore.';
    expect(extractSummary(src)).toBe('A 3D portfolio built with React and Three.js.');
    expect(extractSummary('# Only a title')).toBeUndefined();
  });

  it('truncates long summaries on a word boundary', () => {
    const summary = extractSummary(`${'word '.repeat(100)}end`, 50)!;
    expect(summary.length).toBeLessThanOrEqual(50);
    expect(summary.endsWith('…')).toBe(true);
    expect(summary).not.toMatch(/wor…$/);
  });
});
