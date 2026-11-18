import { guessCategory, languageInfo, lookupTech, normalizeTechKey, uniqueNames } from './tech-catalog';

describe('tech catalog', () => {
  it('normalizes keys', () => {
    expect(normalizeTechKey('Next.js')).toBe('nextjs');
    expect(normalizeTechKey('three-js')).toBe('threejs');
  });

  it('maps topics and languages to display names and categories', () => {
    expect(lookupTech('nestjs')).toEqual({ name: 'NestJS', category: 'backend' });
    expect(lookupTech('next-js')).toEqual({ name: 'Next.js', category: 'frontend' });
    expect(lookupTech('docker')).toEqual({ name: 'Docker', category: 'tools' });
    expect(lookupTech('portfolio')).toBeNull();
    expect(languageInfo('Dockerfile')).toEqual({ name: 'Docker', category: 'tools' });
    expect(languageInfo('Makefile')).toBeNull();
    expect(languageInfo('Zig')).toEqual({ name: 'Zig', category: 'other' });
  });

  it('guesses categories and dedupes names', () => {
    expect(guessCategory('TypeScript')).toBe('frontend');
    expect(guessCategory('Unknown Tool')).toBe('other');
    expect(uniqueNames(['React', 'react', ' ', 'Vue', 'REACT'])).toEqual(['React', 'Vue']);
  });
});
