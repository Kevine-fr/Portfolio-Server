'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Github, Loader2 } from 'lucide-react';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ImageUpload } from '@/components/ui/image-upload';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { VideoUpload } from '@/components/ui/video-upload';
import { SkillsMultiSelect } from '@/components/ui/skills-multi-select';

const schema = z.object({
  title:           z.string().min(2, 'Au moins 2 caractères'),
  slug:            z.string().min(2).regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  subtitle:        z.string().optional(),
  description:     z.string().optional(),
  longDescription: z.string().optional(),
  techStack:       z.array(z.string()).default([]),
  coverImage:      z.string().optional(),
  gallery:         z.array(z.string()).max(30, 'Maximum 30 images').default([]),
  demoVideo:       z.string().optional(),
  liveUrl:         z.string().url('URL invalide').optional().or(z.literal('')),
  repoUrl:         z.string().url('URL invalide').optional().or(z.literal('')),
  featured:        z.boolean().optional(),
  status:          z.enum(['draft', 'published', 'archived']),
  contentFormat:   z.enum(['text', 'markdown']),
  // An empty "Année" input used to be coerced to 0
  year:            z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
    z.coerce.number().int().min(1900, 'Année invalide').max(2100, 'Année invalide').optional(),
  ),
  order:           z.coerce.number().int().optional(),
});

export type ProjectFormValues = z.infer<typeof schema>;

/**
 * Form values → API payload. Removed media / links are sent as null: they used
 * to be sent as undefined, dropped by JSON.stringify, so a cover image, a
 * video or a URL could never be removed once set.
 */
export function buildProjectPayload(raw: ProjectFormValues) {
  return {
    ...raw,
    coverImage: raw.coverImage || null,
    demoVideo:  raw.demoVideo  || null,
    liveUrl:    raw.liveUrl    || null,
    repoUrl:    raw.repoUrl    || null,
    year:       raw.year ?? null,
  };
}

interface Props {
  defaultValues?: Partial<Project>;
  onSubmit: (data: any) => unknown | Promise<unknown>;
  submitting?: boolean;
  onCancel: () => void;
}

type Tab = 'general' | 'content' | 'media' | 'meta';

export function ProjectForm({ defaultValues, onSubmit, submitting, onCancel }: Props) {
  const [tab, setTab] = useState<Tab>('general');

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:           defaultValues?.title ?? '',
      slug:            defaultValues?.slug  ?? '',
      subtitle:        defaultValues?.subtitle ?? '',
      description:     defaultValues?.description ?? '',
      longDescription: defaultValues?.longDescription ?? '',
      techStack:       defaultValues?.techStack ?? [],
      coverImage:      defaultValues?.coverImage ?? '',
      gallery:         defaultValues?.gallery ?? [],
      demoVideo:       defaultValues?.demoVideo ?? '',
      liveUrl:         defaultValues?.liveUrl ?? '',
      repoUrl:         defaultValues?.repoUrl ?? '',
      featured:        defaultValues?.featured ?? false,
      status:          (defaultValues?.status as any) ?? 'draft',
      contentFormat:   defaultValues?.contentFormat ?? 'text',
      year:            defaultValues?.year ?? new Date().getFullYear(),
      order:           defaultValues?.order ?? 0,
    },
  });

  const status   = watch('status');
  const contentFormat = watch('contentFormat');
  const synced = defaultValues?.source === 'github' && defaultValues.github?.autoSync !== false;
  const featured = watch('featured');
  const gallery  = watch('gallery');

  const internalSubmit = (raw: ProjectFormValues) => onSubmit(buildProjectPayload(raw));

  const tabs: { value: Tab; label: string; badge?: string | number }[] = [
    { value: 'general', label: 'Général' },
    { value: 'content', label: 'Contenu' },
    { value: 'media',   label: 'Médias', badge: gallery.length > 0 ? gallery.length : undefined },
    { value: 'meta',    label: 'Méta' },
  ];

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-4">
      {synced && (
        <div role="note" className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
          <Github className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Synchronisé depuis <strong>{defaultValues?.github?.fullName}</strong> : titre, description, contenu,
            technologies, liens, statut et année seront écrasés à la prochaine synchronisation. Modifiez plutôt le
            README ou le <code>.portfolio.yml</code>, ou détachez le projet depuis la page GitHub.
          </p>
        </div>
      )}
      {/* Tabs */}
      <div className="flex gap-1 rounded-md border p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex-1 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-4 animate-fade-in">
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
          <FormField label="Description courte" hint="Résumé en une ou deux phrases">
            <Textarea rows={2} {...register('description')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="URL du site" error={errors.liveUrl?.message}>
              <Input type="url" placeholder="https://…" {...register('liveUrl')} />
            </FormField>
            <FormField label="URL du dépôt" error={errors.repoUrl?.message}>
              <Input type="url" placeholder="https://github.com/…" {...register('repoUrl')} />
            </FormField>
          </div>
        </div>
      )}

      {tab === 'content' && (
        <div className="space-y-4 animate-fade-in">
          <FormField label="Format du contenu" hint="Markdown : titres, listes, liens, images, tableaux… (rendu sécurisé)">
            <Select value={contentFormat} onValueChange={(v) => setValue('contentFormat', v as 'text' | 'markdown')}>
              <SelectTrigger aria-label="Format du contenu"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texte simple</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Description complète" hint={contentFormat === 'markdown' ? 'Rédigée en Markdown' : 'Les retours à la ligne sont conservés'}>
            <Textarea rows={8} {...register('longDescription')} />
          </FormField>
          <FormField label="Technologies" hint="Sélectionnées parmi vos compétences enregistrées">
            <Controller
              control={control}
              name="techStack"
              render={({ field }) => (
                <SkillsMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-6 animate-fade-in">
          <FormField label="Image de couverture" hint="Visuel principal du projet">
            <Controller
              control={control}
              name="coverImage"
              render={({ field }) => (
                <ImageUpload value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>

          <FormField
            label={`Galerie (${gallery.length}/30)`}
            hint="Captures d'écran pour présenter le projet"
            error={errors.gallery?.message as string | undefined}
          >
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => (
                <MultiImageUpload value={field.value} onChange={field.onChange} max={30} />
              )}
            />
          </FormField>

          <FormField label="Vidéo de démonstration (facultatif)" hint="Une démo vidéo du projet en action">
            <Controller
              control={control}
              name="demoVideo"
              render={({ field }) => (
                <VideoUpload value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>
        </div>
      )}

      {tab === 'meta' && (
        <div className="space-y-4 animate-fade-in">
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
            <FormField label="Année" error={errors.year?.message as string | undefined}>
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
        </div>
      )}

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
