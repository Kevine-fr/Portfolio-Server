'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';

const schema = z.object({
  title:           z.string().min(2, 'Au moins 2 caractères'),
  slug:            z.string().min(2).regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  subtitle:        z.string().optional(),
  description:     z.string().optional(),
  longDescription: z.string().optional(),
  techStack:       z.string().optional(),
  coverImage:      z.string().url('URL invalide').optional().or(z.literal('')),
  liveUrl:         z.string().url('URL invalide').optional().or(z.literal('')),
  repoUrl:         z.string().url('URL invalide').optional().or(z.literal('')),
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
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProjectFormValues>({
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

  const status = watch('status');
  const featured = watch('featured');

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Titre" required error={errors.title?.message}>
          <Input {...register('title')} />
        </FormField>
        <FormField label="Identifiant URL" required hint="exemple : portfolio-3d" error={errors.slug?.message}>
          <Input {...register('slug')} />
        </FormField>
      </div>

      <FormField label="Sous-titre">
        <Input {...register('subtitle')} />
      </FormField>

      <FormField label="Description courte">
        <Textarea rows={2} {...register('description')} />
      </FormField>

      <FormField label="Description complète">
        <Textarea rows={5} {...register('longDescription')} />
      </FormField>

      <FormField label="Technologies" hint="Séparées par des virgules">
        <Input placeholder="React, Three.js, NestJS" {...register('techStack')} />
      </FormField>

      <FormField label="Image de couverture" error={errors.coverImage?.message}>
        <Input type="url" placeholder="https://…" {...register('coverImage')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="URL du site" error={errors.liveUrl?.message}>
          <Input type="url" placeholder="https://…" {...register('liveUrl')} />
        </FormField>
        <FormField label="URL du dépôt" error={errors.repoUrl?.message}>
          <Input type="url" placeholder="https://github.com/…" {...register('repoUrl')} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Statut">
          <Select value={status} onValueChange={(v) => setValue('status', v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Année">
          <Input type="number" {...register('year')} />
        </FormField>
        <FormField label="Ordre" hint="Tri croissant">
          <Input type="number" {...register('order')} />
        </FormField>
      </div>

      <div className="flex items-start gap-3 rounded-md border p-4">
        <Checkbox
          id="featured"
          checked={featured}
          onCheckedChange={(v) => setValue('featured', !!v)}
        />
        <div className="space-y-1">
          <label htmlFor="featured" className="text-sm font-medium leading-none cursor-pointer">
            Projet mis en avant
          </label>
          <p className="text-xs text-muted-foreground">
            Affiché en priorité sur le portfolio.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
