'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/Field';
import { Project } from '@/types';

const schema = z.object({
  title:           z.string().min(2),
  slug:            z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase, digits, hyphens only'),
  subtitle:        z.string().optional(),
  description:     z.string().optional(),
  longDescription: z.string().optional(),
  techStack:       z.string().optional(),   // comma-separated, transformed later
  coverImage:      z.string().url().optional().or(z.literal('')),
  liveUrl:         z.string().url().optional().or(z.literal('')),
  repoUrl:         z.string().url().optional().or(z.literal('')),
  featured:        z.boolean().optional(),
  status:          z.enum(['draft', 'published', 'archived']),
  year:            z.coerce.number().int().optional(),
  order:           z.coerce.number().int().optional(),
});

export type ProjectFormValues = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Project>;
  onSubmit: (data: any) => void | Promise<void>;
  submitting?: boolean;
  onCancel: () => void;
}

export function ProjectForm({ defaultValues, onSubmit, submitting, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:           defaultValues?.title ?? '',
      slug:            defaultValues?.slug  ?? '',
      subtitle:        defaultValues?.subtitle ?? '',
      description:     defaultValues?.description ?? '',
      longDescription: defaultValues?.longDescription ?? '',
      techStack:       defaultValues?.techStack?.join(', ') ?? '',
      coverImage:      defaultValues?.coverImage ?? '',
      liveUrl:         defaultValues?.liveUrl ?? '',
      repoUrl:         defaultValues?.repoUrl ?? '',
      featured:        defaultValues?.featured ?? false,
      status:          (defaultValues?.status as any) ?? 'draft',
      year:            defaultValues?.year ?? new Date().getFullYear(),
      order:           defaultValues?.order ?? 0,
    },
  });

  const internalSubmit = (raw: ProjectFormValues) => {
    const payload = {
      ...raw,
      techStack: raw.techStack ? raw.techStack.split(',').map((t) => t.trim()).filter(Boolean) : [],
      coverImage: raw.coverImage || undefined,
      liveUrl:    raw.liveUrl    || undefined,
      repoUrl:    raw.repoUrl    || undefined,
    };
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(internalSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="Title"      required {...register('title')}    error={errors.title?.message} />
        <Input label="Slug"       required {...register('slug')}     error={errors.slug?.message} hint="URL-safe id, e.g. 'cosmic-portfolio'" />
        <Input label="Subtitle"   {...register('subtitle')} />
        <Input label="Year"       type="number" {...register('year')} />
      </div>
      <Textarea label="Short description" rows={2} {...register('description')} />
      <Textarea label="Long description"  rows={5} {...register('longDescription')} />
      <Input label="Tech stack" hint="Comma-separated, e.g. React, Three.js, NestJS" {...register('techStack')} />
      <Input label="Cover image URL" {...register('coverImage')} error={errors.coverImage?.message} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="Live URL" {...register('liveUrl')} error={errors.liveUrl?.message} />
        <Input label="Repo URL" {...register('repoUrl')} error={errors.repoUrl?.message} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Select label="Status" {...register('status')} options={[
          { value: 'draft',     label: 'draft' },
          { value: 'published', label: 'published' },
          { value: 'archived',  label: 'archived' },
        ]} />
        <Input label="Order" type="number" {...register('order')} />
      </div>

      <Checkbox label="Featured project" hint="Highlight in portfolio's hero section" {...register('featured')} />

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-goldDeep/15">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : '> save'}
        </button>
      </div>
    </form>
  );
}
