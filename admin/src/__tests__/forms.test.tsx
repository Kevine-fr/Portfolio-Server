import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { buildProjectPayload, ProjectForm } from '@/components/forms/project-form';
import { buildEducationPayload } from '@/components/forms/education-form';
import { buildExperiencePayload } from '@/components/forms/experience-form';
import { buildUserPayload } from '@/components/forms/user-form';
import { renderWithClient } from './test-utils';

vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), apiGet: vi.fn().mockResolvedValue([]) }));

describe('form payloads', () => {
  it('sends null for removed project media and links (they could not be cleared before)', () => {
    const payload = buildProjectPayload({
      title: 'P', slug: 'p', techStack: [], gallery: [], status: 'published', contentFormat: 'text',
      coverImage: '', demoVideo: '', liveUrl: '', repoUrl: '', year: undefined,
    } as any);
    expect(payload).toMatchObject({ coverImage: null, demoVideo: null, liveUrl: null, repoUrl: null, year: null });
    expect(buildProjectPayload({ coverImage: '/uploads/a.png', year: 2024 } as any)).toMatchObject({ coverImage: '/uploads/a.png', year: 2024 });
  });

  it('sends null instead of "" for a missing education end date', () => {
    expect(buildEducationPayload({ school: 'U', degree: 'M', startDate: '2020-01-01', endDate: '' })).toMatchObject({ endDate: null });
  });

  it('clears the experience end date when current and splits achievements', () => {
    const p = buildExperiencePayload({
      title: 'Dev', company: 'ACME', startDate: '2020-01-01', endDate: '2021-01-01', current: true,
      achievements: ' A \n\n B ', techStack: [],
    });
    expect(p).toMatchObject({ endDate: null, achievements: ['A', 'B'] });
    expect(buildExperiencePayload({ title: 'x', company: 'y', startDate: 's', endDate: '', current: false, techStack: [] }).endDate).toBeNull();
  });

  it('omits an empty password when editing a user', () => {
    expect(buildUserPayload({ email: ' a@b.c ', name: 'A', role: 'admin', password: '' }, true)).toEqual({ email: 'a@b.c', name: 'A', role: 'admin' });
    expect(buildUserPayload({ email: 'a@b.c', password: 'secret1' }, false)).toMatchObject({ password: 'secret1' });
  });
});

describe('ProjectForm', () => {
  const base = { title: 'Synced', slug: 'synced', techStack: [], gallery: [], status: 'published' as const };

  it('warns that a synced project is managed by GitHub', () => {
    renderWithClient(
      <ProjectForm
        defaultValues={{ ...base, source: 'github', github: { fullName: 'kev/synced', autoSync: true } as any }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('note')).toHaveTextContent('kev/synced');
  });

  it('shows no warning for manual or detached projects', () => {
    const { unmount } = renderWithClient(<ProjectForm defaultValues={base} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('note')).toBeNull();
    unmount();
    renderWithClient(
      <ProjectForm defaultValues={{ ...base, source: 'github', github: { fullName: 'kev/x', autoSync: false } as any }} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('note')).toBeNull();
  });
});
